/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * GPU-accelerated fuzzy simplicial set construction.
 *
 * Eliminates the CPU bottleneck between GPU KNN and GPU SGD by porting
 * smoothKNNDistance + computeMembershipStrengths + symmetrization to WebGPU
 * compute shaders.
 *
 * Two-dispatch pipeline:
 *   Dispatch 1 (per-point): Binary search for sigma/rho, compute K membership
 *     strengths. Output: N×K edge values.
 *   Dispatch 2 (per-point): For each of K edges, look up reverse edge value
 *     (O(K) scan), compute symmetrized value. Output: forward + reverse arrays.
 *
 * Memory: O(N×K) — never materializes an N×N matrix.
 */

const K_MAX = 128;

// ─── Pass 1: smoothKNNDistance + computeMembershipStrengths ──────────

function makeMembershipShader(): string {
  return /* wgsl */ `
struct Params {
  n: u32,
  k: u32,
  nIter: u32,
  localConnectivity: f32,
  bandwidth: f32,
  setOpMixRatio: f32,
  globalMeanDist: f32,
  _pad: u32,
}

const SMOOTH_K_TOLERANCE: f32 = 1e-5;
const MIN_K_DIST_SCALE: f32 = 1e-3;

@group(0) @binding(0) var<uniform> params: Params;
@group(0) @binding(1) var<storage, read> knnIndices: array<u32>;
@group(0) @binding(2) var<storage, read> knnDistances: array<f32>;
@group(0) @binding(3) var<storage, read_write> edgeVals: array<f32>;

@compute @workgroup_size(64)
fn main(@builtin(global_invocation_id) gid: vec3u) {
  let i = gid.x;
  let n = params.n;
  let k = params.k;

  if (i >= n) { return; }

  let base = i * k;
  let targetVal = log2(f32(k)) * params.bandwidth;
  let localConn = params.localConnectivity;

  // ── Compute rho (distance to nearest non-identical neighbor) ──

  // KNN distances are already sorted; collect non-zero ones
  var nonZeroDists: array<f32, ${K_MAX}>;
  var nzCount: u32 = 0u;
  for (var j = 0u; j < k; j++) {
    let d = knnDistances[base + j];
    if (d > 0.0) {
      nonZeroDists[nzCount] = d;
      nzCount++;
    }
  }

  var rho: f32 = 0.0;
  if (f32(nzCount) >= localConn) {
    let lcIndex = u32(floor(localConn));
    let interp = localConn - f32(lcIndex);
    if (lcIndex > 0u) {
      rho = nonZeroDists[lcIndex - 1u];
      if (interp > SMOOTH_K_TOLERANCE) {
        rho += interp * (nonZeroDists[lcIndex] - nonZeroDists[lcIndex - 1u]);
      }
    } else {
      rho = interp * nonZeroDists[0];
    }
  } else if (nzCount > 0u) {
    var maxD: f32 = 0.0;
    for (var j = 0u; j < nzCount; j++) {
      maxD = max(maxD, nonZeroDists[j]);
    }
    rho = maxD;
  }

  // ── Binary search for sigma ──

  var lo: f32 = 0.0;
  var hi: f32 = 1e38;
  var mid: f32 = 1.0;

  for (var iter = 0u; iter < params.nIter; iter++) {
    var psum: f32 = 0.0;
    for (var j = 1u; j < k; j++) {
      let d = knnDistances[base + j] - rho;
      if (d > 0.0) {
        psum += exp(-(d / mid));
      } else {
        psum += 1.0;
      }
    }

    if (abs(psum - targetVal) < SMOOTH_K_TOLERANCE) { break; }

    if (psum > targetVal) {
      hi = mid;
      mid = (lo + hi) / 2.0;
    } else {
      lo = mid;
      if (hi >= 1e38) {
        mid = mid * 2.0;
      } else {
        mid = (lo + hi) / 2.0;
      }
    }
  }

  var sigma: f32 = mid;

  // ── Apply minimum scale to prevent sigma collapse ──
  if (rho > 0.0) {
    var meanDist: f32 = 0.0;
    for (var j = 0u; j < k; j++) {
      meanDist += knnDistances[base + j];
    }
    meanDist /= f32(k);
    sigma = max(sigma, MIN_K_DIST_SCALE * meanDist);
  } else {
    // Point has all-zero distances (exact duplicates).
    // CPU uses global mean; we receive it as a parameter.
    sigma = max(sigma, MIN_K_DIST_SCALE * params.globalMeanDist);
  }

  // ── Compute membership strengths for K neighbors ──
  for (var j = 0u; j < k; j++) {
    let idx = base + j;
    let neighborIdx = knnIndices[idx];
    var val: f32 = 0.0;

    // Skip self-loops and sentinel (-1 as u32 = 0xFFFFFFFF)
    if (neighborIdx != 0xFFFFFFFFu && neighborIdx != i) {
      let d = knnDistances[idx] - rho;
      if (d <= 0.0) {
        val = 1.0;
      } else {
        val = exp(-(d / sigma));
      }
    }

    edgeVals[idx] = val;
  }
}
`;
}

// ─── Pass 2: Symmetrize using reverse-edge lookup ───────────────────

function makeSymmetrizeShader(): string {
  return /* wgsl */ `
struct Params {
  n: u32,
  k: u32,
  nIter: u32,
  localConnectivity: f32,
  bandwidth: f32,
  setOpMixRatio: f32,
  globalMeanDist: f32,
  _pad: u32,
}

@group(0) @binding(0) var<uniform> params: Params;
@group(0) @binding(1) var<storage, read> knnIndices: array<u32>;
@group(0) @binding(2) var<storage, read> edgeVals: array<f32>;
@group(0) @binding(3) var<storage, read_write> symForward: array<f32>;
@group(0) @binding(4) var<storage, read_write> symReverse: array<f32>;

@compute @workgroup_size(64)
fn main(@builtin(global_invocation_id) gid: vec3u) {
  let i = gid.x;
  let n = params.n;
  let k = params.k;
  let mix = params.setOpMixRatio;

  if (i >= n) { return; }

  let base = i * k;

  for (var j = 0u; j < k; j++) {
    let idx = base + j;
    let m = knnIndices[idx];
    let a = edgeVals[idx]; // A[i, m]

    // Look up reverse edge A[m, i] by scanning m's K neighbors
    var b: f32 = 0.0;
    if (a > 0.0 && m < n) {
      let mBase = m * k;
      for (var jj = 0u; jj < k; jj++) {
        if (knnIndices[mBase + jj] == i) {
          b = edgeVals[mBase + jj];
          break;
        }
      }
    }

    // Symmetrize: mix * (a + b - a*b) + (1 - mix) * a*b
    let ab = a * b;
    symForward[idx] = mix * (a + b - ab) + (1.0 - mix) * ab;

    // If reverse edge (m → i) doesn't exist in KNN graph,
    // we need to create it. Value = mix * a (A^T contribution only).
    if (b == 0.0 && a > 0.0) {
      symReverse[idx] = mix * a;
    } else {
      symReverse[idx] = 0.0;
    }
  }
}
`;
}

// ─── TypeScript wrapper ─────────────────────────────────────────────

export interface FuzzySimplicialSetResult {
  /** Row indices (source) of symmetrized graph edges */
  rows: number[];
  /** Column indices (target) of symmetrized graph edges */
  cols: number[];
  /** Edge weights */
  vals: number[];
}

/**
 * Compute the fuzzy simplicial set on the GPU.
 *
 * Replaces the CPU pipeline: smoothKNNDistance → computeMembershipStrengths
 * → sparse matrix symmetrization.
 *
 * @param device         GPUDevice
 * @param knnIndices     KNN indices [N][K] (from GPU or CPU KNN)
 * @param knnDistances   KNN distances [N][K]
 * @param nPoints        Number of data points (N)
 * @param nNeighbors     Number of neighbors (K)
 * @param localConnectivity  Local connectivity parameter (default 1.0)
 * @param setOpMixRatio  Fuzzy set operation mix ratio (default 1.0)
 */
export async function computeFuzzySimplicialSetGPU(
  device: GPUDevice,
  knnIndices: number[][],
  knnDistances: number[][],
  nPoints: number,
  nNeighbors: number,
  localConnectivity = 1.0,
  setOpMixRatio = 1.0
): Promise<FuzzySimplicialSetResult> {
  const n = nPoints;
  const k = nNeighbors;

  if (k > K_MAX) {
    throw new Error(`nNeighbors (${k}) exceeds GPU maximum (${K_MAX})`);
  }

  // ── Flatten 2D arrays to typed arrays for GPU upload ──

  const flatIndices = new Uint32Array(n * k);
  const flatDistances = new Float32Array(n * k);
  let distanceSum = 0;

  for (let i = 0; i < n; i++) {
    for (let j = 0; j < k; j++) {
      const idx = i * k + j;
      const indexVal = knnIndices[i][j];
      // -1 sentinel → 0xFFFFFFFF in u32
      flatIndices[idx] = indexVal < 0 ? 0xffffffff : indexVal;
      flatDistances[idx] = knnDistances[i][j];
      distanceSum += knnDistances[i][j];
    }
  }

  const globalMeanDist = distanceSum / (n * k);

  // ── Create GPU buffers ──

  const edgeCount = n * k;
  const edgeBytes = edgeCount * 4;

  // Params: 8 × u32/f32 = 32 bytes
  const paramsData = new ArrayBuffer(32);
  const paramsU32 = new Uint32Array(paramsData);
  const paramsF32 = new Float32Array(paramsData);
  paramsU32[0] = n;
  paramsU32[1] = k;
  paramsU32[2] = 64; // nIter
  paramsF32[3] = localConnectivity;
  paramsF32[4] = 1.0; // bandwidth
  paramsF32[5] = setOpMixRatio;
  paramsF32[6] = globalMeanDist;
  paramsU32[7] = 0; // pad

  const paramsBuffer = device.createBuffer({
    size: 32,
    usage: GPUBufferUsage.UNIFORM + GPUBufferUsage.COPY_DST,
  });
  device.queue.writeBuffer(paramsBuffer, 0, paramsData);

  const knnIndicesBuffer = device.createBuffer({
    size: edgeBytes,
    usage: GPUBufferUsage.STORAGE + GPUBufferUsage.COPY_DST,
  });
  device.queue.writeBuffer(knnIndicesBuffer, 0, flatIndices.buffer as ArrayBuffer);

  const knnDistancesBuffer = device.createBuffer({
    size: edgeBytes,
    usage: GPUBufferUsage.STORAGE + GPUBufferUsage.COPY_DST,
  });
  device.queue.writeBuffer(knnDistancesBuffer, 0, flatDistances.buffer as ArrayBuffer);

  const edgeValsBuffer = device.createBuffer({
    size: edgeBytes,
    usage: GPUBufferUsage.STORAGE + GPUBufferUsage.COPY_SRC,
  });

  const symForwardBuffer = device.createBuffer({
    size: edgeBytes,
    usage: GPUBufferUsage.STORAGE + GPUBufferUsage.COPY_SRC,
  });

  const symReverseBuffer = device.createBuffer({
    size: edgeBytes,
    usage: GPUBufferUsage.STORAGE + GPUBufferUsage.COPY_SRC,
  });

  // Staging buffers for readback
  const stagingForward = device.createBuffer({
    size: edgeBytes,
    usage: GPUBufferUsage.MAP_READ + GPUBufferUsage.COPY_DST,
  });
  const stagingReverse = device.createBuffer({
    size: edgeBytes,
    usage: GPUBufferUsage.MAP_READ + GPUBufferUsage.COPY_DST,
  });

  // ── Pass 1: Membership strengths ──

  const membershipModule = device.createShaderModule({
    code: makeMembershipShader(),
  });

  const membershipBGL = device.createBindGroupLayout({
    entries: [
      { binding: 0, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'uniform' } },
      { binding: 1, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'read-only-storage' } },
      { binding: 2, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'read-only-storage' } },
      { binding: 3, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'storage' } },
    ],
  });

  const membershipPipeline = device.createComputePipeline({
    layout: device.createPipelineLayout({ bindGroupLayouts: [membershipBGL] }),
    compute: { module: membershipModule, entryPoint: 'main' },
  });

  const membershipBG = device.createBindGroup({
    layout: membershipBGL,
    entries: [
      { binding: 0, resource: { buffer: paramsBuffer } },
      { binding: 1, resource: { buffer: knnIndicesBuffer } },
      { binding: 2, resource: { buffer: knnDistancesBuffer } },
      { binding: 3, resource: { buffer: edgeValsBuffer } },
    ],
  });

  // ── Pass 2: Symmetrize ──

  const symmetrizeModule = device.createShaderModule({
    code: makeSymmetrizeShader(),
  });

  const symmetrizeBGL = device.createBindGroupLayout({
    entries: [
      { binding: 0, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'uniform' } },
      { binding: 1, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'read-only-storage' } },
      { binding: 2, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'read-only-storage' } },
      { binding: 3, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'storage' } },
      { binding: 4, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'storage' } },
    ],
  });

  const symmetrizePipeline = device.createComputePipeline({
    layout: device.createPipelineLayout({ bindGroupLayouts: [symmetrizeBGL] }),
    compute: { module: symmetrizeModule, entryPoint: 'main' },
  });

  const symmetrizeBG = device.createBindGroup({
    layout: symmetrizeBGL,
    entries: [
      { binding: 0, resource: { buffer: paramsBuffer } },
      { binding: 1, resource: { buffer: knnIndicesBuffer } },
      { binding: 2, resource: { buffer: edgeValsBuffer } },
      { binding: 3, resource: { buffer: symForwardBuffer } },
      { binding: 4, resource: { buffer: symReverseBuffer } },
    ],
  });

  // ── Dispatch both passes ──

  const workgroups = Math.ceil(n / 64);

  const encoder = device.createCommandEncoder();

  // Pass 1: compute membership strengths
  const pass1 = encoder.beginComputePass();
  pass1.setPipeline(membershipPipeline);
  pass1.setBindGroup(0, membershipBG);
  pass1.dispatchWorkgroups(workgroups);
  pass1.end();

  // Pass 2: symmetrize
  const pass2 = encoder.beginComputePass();
  pass2.setPipeline(symmetrizePipeline);
  pass2.setBindGroup(0, symmetrizeBG);
  pass2.dispatchWorkgroups(workgroups);
  pass2.end();

  // Copy results to staging
  encoder.copyBufferToBuffer(symForwardBuffer, 0, stagingForward, 0, edgeBytes);
  encoder.copyBufferToBuffer(symReverseBuffer, 0, stagingReverse, 0, edgeBytes);

  device.queue.submit([encoder.finish()]);

  // ── Readback ──

  await Promise.all([
    stagingForward.mapAsync(GPUMapMode.READ),
    stagingReverse.mapAsync(GPUMapMode.READ),
  ]);

  const forwardArr = new Float32Array(stagingForward.getMappedRange().slice(0));
  const reverseArr = new Float32Array(stagingReverse.getMappedRange().slice(0));
  stagingForward.unmap();
  stagingReverse.unmap();

  // ── Assemble COO edge list on CPU ──
  //
  // forwardArr[i*k+j] = symmetrized value for edge (i → knnIndices[i][j])
  // reverseArr[i*k+j] = value for new edge (knnIndices[i][j] → i) if reverse
  //                      didn't exist in KNN graph; 0 otherwise.

  const rows: number[] = [];
  const cols: number[] = [];
  const vals: number[] = [];

  for (let i = 0; i < n; i++) {
    const base = i * k;
    for (let j = 0; j < k; j++) {
      const idx = base + j;
      const fwd = forwardArr[idx];
      if (fwd > 0) {
        rows.push(i);
        cols.push(flatIndices[idx]);
        vals.push(fwd);
      }
      const rev = reverseArr[idx];
      if (rev > 0) {
        rows.push(flatIndices[idx]);
        cols.push(i);
        vals.push(rev);
      }
    }
  }

  // ── Cleanup GPU resources ──

  paramsBuffer.destroy();
  knnIndicesBuffer.destroy();
  knnDistancesBuffer.destroy();
  edgeValsBuffer.destroy();
  symForwardBuffer.destroy();
  symReverseBuffer.destroy();
  stagingForward.destroy();
  stagingReverse.destroy();

  return { rows, cols, vals };
}
