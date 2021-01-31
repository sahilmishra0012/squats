async function setupCamera() {
    const video = document.getElementById('video');
    video.width = 1000;
    video.height = 1000;
    if (navigator.mediaDevices.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({
            'audio': false,
            'video': {
                facingMode: 'user',
                width: 1000,
                height: 1000
            }
        })
        video.srcObject = stream;

    }
    return new Promise(resolve => {
        video.onloadedmetadata = () => {
            resolve(video);
        };
    });
}

async function loadVideo() {
    const video = await setupCamera();
    video.play();
    return video;
}

function drawKeypoints(keypoints, minConfidence, ctx, angle, scale = 1) {
    for (let i = 0; i < keypoints.length; i++) {
        const keypoint = keypoints[i];
        if (keypoint.score < minConfidence) {
            continue;
        }
        if (angle < 90) {
            const { y, x } = keypoint.position;
            ctx.beginPath();
            ctx.arc(x * scale, y * scale, 3, 0, 2 * Math.PI);
            ctx.fillStyle = 'green';
            ctx.fill();
        } else {
            const { y, x } = keypoint.position;
            ctx.beginPath();
            ctx.arc(x * scale, y * scale, 3, 0, 2 * Math.PI);
            ctx.fillStyle = 'aqua';
            ctx.fill();
        }
    }
}

function drawSegment([ay, ax], [by, bx], color, scale, ctx) {
    ctx.beginPath();
    ctx.moveTo(ax * scale, ay * scale);
    ctx.lineTo(bx * scale, by * scale);
    ctx.lineWidth = 10;
    ctx.strokeStyle = color;
    ctx.stroke();
}


function drawSkeleton(keypoints, minConfidence, ctx, angle, scale = 1) {
    const adjacentKeyPoints = posenet.getAdjacentKeyPoints(keypoints, minConfidence);
    if (angle < 90) {
        adjacentKeyPoints.forEach(keypoints => {
            drawSegment(toTuple(keypoints[0].position), toTuple(keypoints[1].position), 'green', scale, ctx);
        });

    } else {
        adjacentKeyPoints.forEach(keypoints => {
            drawSegment(toTuple(keypoints[0].position), toTuple(keypoints[1].position), 'aqua', scale, ctx);
        });
    }
}

function requestAnimationFrame(callback) {
    setTimeout(callback, 1000 / 60);
}


function find_angle(A, B, C) {
    var AB = Math.sqrt(Math.pow(B.x - A.x, 2) + Math.pow(B.y - A.y, 2));
    var BC = Math.sqrt(Math.pow(B.x - C.x, 2) + Math.pow(B.y - C.y, 2));
    var AC = Math.sqrt(Math.pow(C.x - A.x, 2) + Math.pow(C.y - A.y, 2));
    return Math.acos((BC * BC + AB * AB - AC * AC) / (2 * BC * AB));
}

function detectPoseInRealTime(video, net) {
    const canvas = document.getElementById('output');
    document.getElementById('video').style.display = 'none';

    document.getElementById('loadmodel').style.display = 'none';

    const ctx = canvas.getContext('2d');

    const counter = document.getElementById('counter');
    const cntctx = counter.getContext('2d');

    canvas.width = 1000;
    canvas.height = 1000;

    async function poseDetectionFrame() {
        let poses = [];
        let minPoseConfidence;
        let minPartConfidence;
        const pose = await net.estimateSinglePose(video, { imageScaleFactor: 1, flipHorizontal: true, outputStride: 8 });
        angle = find_angle(pose.keypoints[11].position, pose.keypoints[13].position, pose.keypoints[15].position) * 180 / Math.PI
        poses.push(pose);
        if (angle > 120) {
            step = 2;
        } else if (step == 2 && angle > 90 && angle < 120) {
            step = 3;
        } else if (step == 3 && angle < 90) {
            step = 4;
        } else if (step == 4 && angle > 100) {
            step = 5;
            count++;
            console.log(count);
        }
        minPoseConfidence = 0.1
        minPartConfidence = 0.5

        cntctx.clearRect(0, 0, 500, 500);
        cntctx.save();
        ctx.scale(-1, 1);
        cntctx.font = "100px Arial";
        cntctx.fillText(count, counter.width / 2, counter.height / 2);
        cntctx.scale(-1, 1);
        cntctx.restore();

        ctx.clearRect(0, 0, 1000, 1000);
        ctx.save();
        ctx.scale(-1, 1);
        ctx.translate(-1000, 0);
        ctx.drawImage(video, 0, 0, 1000, 1000);
        ctx.restore();

        poses.forEach(({ score, keypoints }) => {
            if (score >= minPoseConfidence) {
                drawKeypoints(keypoints, minPartConfidence, ctx, angle);
                drawSkeleton(keypoints, minPartConfidence, ctx, angle);
            }
        });
        requestAnimationFrame(poseDetectionFrame);
    }
    poseDetectionFrame();
}

async function bindPage() {
    const net = await posenet.load();
    document.getElementById('loading').style.display = 'none';
    document.getElementById('loadmodel').style.display = 'block';
    let video;
    try {
        video = await loadVideo();
    } catch (e) {
        window.alert(e);
        throw e;
    }
    detectPoseInRealTime(video, net);
}

var step = 2;
var count = 0;
bindPage();