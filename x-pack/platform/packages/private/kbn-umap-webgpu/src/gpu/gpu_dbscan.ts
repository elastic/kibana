/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * GPU-accelerated DBSCAN clustering for 2D/3D UMAP embeddings.
 *
 * Three-pass compute pipeline:
 *   Pass 1 (per-point): Find k-th nearest distance + count epsilon-neighbors.
 *     → CPU picks 90th-percentile k-dist as epsilon, marks core points.
 *   Pass 2 (iterative, per-point): Label propagation on core points.
 *     Each core point takes min(own label, core epsilon-neighbors' labels).
 *     Converges when no labels change (atomic flag). ~5-10 iterations typical.
 *   Pass 3 (per-point): Border assignment — non-core points adopt nearest
 *     core neighbor's label. No core neighbor within epsilon → noise.
 *
 * Memory: O(N) — no adjacency lists or N×N matrices.
 * Works on 2D and 3D embeddings (nComponents = 2 or 3).
 */

import { getDevice } from './webgpu_context';

// ─── Pass 1: k-NN distance + neighbor count ─────────────────────────

function makeKDistShader(maxK: number): string {
  return /* wgsl */ `
struct Params {
  n: u32,
  nComponents: u32,
  k: u32,
  _pad: u32,
}

@group(0) @binding(0) var<uniform> params: Params;
@group(0) @binding(1) var<storage, read> points: array<f32>;
@group(0) @binding(2) var<storage, read_write> kDists: array<f32>;

@compute @workgroup_size(64)
fn main(@builtin(global_invocation_id) gid: vec3u) {
  let i = gid.x;
  let n = params.n;
  let dim = params.nComponents;
  let k = params.k;

  if (i >= n) { return; }

  // Maintain a top-K max-heap of nearest distances (unsorted set + tracked max)
  var topDist: array<f32, ${maxK}>;
  for (var ki = 0u; ki < k; ki++) {
    topDist[ki] = 1e38;
  }
  var curMaxKi: u32 = 0u;
  var curMaxD: f32 = 1e38;

  let iBase = i * dim;

  for (var j = 0u; j < n; j++) {
    if (j == i) { continue; }

    var d2: f32 = 0.0;
    let jBase = j * dim;
    for (var d = 0u; d < dim; d++) {
      let diff = points[iBase + d] - points[jBase + d];
      d2 += diff * diff;
    }
    let dist = sqrt(d2);

    if (dist < curMaxD) {
      topDist[curMaxKi] = dist;

      // Rescan for new max
      curMaxKi = 0u;
      curMaxD = topDist[0];
      for (var ki = 1u; ki < k; ki++) {
        if (topDist[ki] > curMaxD) {
          curMaxD = topDist[ki];
          curMaxKi = ki;
        }
      }
    }
  }

  // k-th nearest distance = the max in our top-K set
  kDists[i] = curMaxD;
}
`;
}

// ─── Pass 2: Label propagation (connected components on core points) ─

function makeLabelPropShader(): string {
  return /* wgsl */ `
struct Params {
  n: u32,
  nComponents: u32,
  epsilon: f32,
  minPts: u32,
}

@group(0) @binding(0) var<uniform> params: Params;
@group(0) @binding(1) var<storage, read> points: array<f32>;
@group(0) @binding(2) var<storage, read> neighborCounts: array<u32>;
@group(0) @binding(3) var<storage, read_write> labels: array<u32>;
@group(0) @binding(4) var<storage, read_write> changed: array<atomic<u32>>;

@compute @workgroup_size(64)
fn main(@builtin(global_invocation_id) gid: vec3u) {
  let i = gid.x;
  let n = params.n;
  let dim = params.nComponents;
  let eps = params.epsilon;
  let minPts = params.minPts;

  if (i >= n) { return; }

  // Only core points participate in label propagation
  if (neighborCounts[i] < minPts) { return; }

  let iBase = i * dim;
  var myLabel = labels[i];

  for (var j = 0u; j < n; j++) {
    if (j == i) { continue; }

    // Skip non-core neighbors
    if (neighborCounts[j] < minPts) { continue; }

    // Check if within epsilon
    var d2: f32 = 0.0;
    let jBase = j * dim;
    for (var d = 0u; d < dim; d++) {
      let diff = points[iBase + d] - points[jBase + d];
      d2 += diff * diff;
    }

    if (sqrt(d2) <= eps) {
      let neighborLabel = labels[j];
      if (neighborLabel < myLabel) {
        myLabel = neighborLabel;
      }
    }
  }

  if (myLabel != labels[i]) {
    labels[i] = myLabel;
    atomicAdd(&changed[0], 1u);
  }
}
`;
}

// ─── Pass 3: Border assignment ──────────────────────────────────────

function makeBorderAssignShader(): string {
  return /* wgsl */ `
struct Params {
  n: u32,
  nComponents: u32,
  epsilon: f32,
  minPts: u32,
}

@group(0) @binding(0) var<uniform> params: Params;
@group(0) @binding(1) var<storage, read> points: array<f32>;
@group(0) @binding(2) var<storage, read> neighborCounts: array<u32>;
@group(0) @binding(3) var<storage, read_write> labels: array<u32>;

@compute @workgroup_size(64)
fn main(@builtin(global_invocation_id) gid: vec3u) {
  let i = gid.x;
  let n = params.n;
  let dim = params.nComponents;
  let eps = params.epsilon;
  let minPts = params.minPts;

  if (i >= n) { return; }

  // Only process non-core points
  if (neighborCounts[i] >= minPts) { return; }

  let iBase = i * dim;
  var bestDist: f32 = 1e38;
  var bestLabel: u32 = 0xFFFFFFFFu;

  for (var j = 0u; j < n; j++) {
    if (j == i) { continue; }

    // Only consider core neighbors
    if (neighborCounts[j] < minPts) { continue; }

    var d2: f32 = 0.0;
    let jBase = j * dim;
    for (var d = 0u; d < dim; d++) {
      let diff = points[iBase + d] - points[jBase + d];
      d2 += diff * diff;
    }
    let dist = sqrt(d2);

    if (dist <= eps && dist < bestDist) {
      bestDist = dist;
      bestLabel = labels[j];
    }
  }

  labels[i] = bestLabel; // 0xFFFFFFFF = noise
}
`;
}

// ─── Pass 1b: Count epsilon-neighbors (after CPU determines epsilon) ─

function makeNeighborCountShader(): string {
  return /* wgsl */ `
struct Params {
  n: u32,
  nComponents: u32,
  epsilon: f32,
  _pad: u32,
}

@group(0) @binding(0) var<uniform> params: Params;
@group(0) @binding(1) var<storage, read> points: array<f32>;
@group(0) @binding(2) var<storage, read_write> neighborCounts: array<u32>;

@compute @workgroup_size(64)
fn main(@builtin(global_invocation_id) gid: vec3u) {
  let i = gid.x;
  let n = params.n;
  let dim = params.nComponents;
  let eps = params.epsilon;

  if (i >= n) { return; }

  let iBase = i * dim;
  var count: u32 = 0u;

  for (var j = 0u; j < n; j++) {
    if (j == i) { continue; }

    var d2: f32 = 0.0;
    let jBase = j * dim;
    for (var d = 0u; d < dim; d++) {
      let diff = points[iBase + d] - points[jBase + d];
      d2 += diff * diff;
    }

    if (sqrt(d2) <= eps) {
      count++;
    }
  }

  neighborCounts[i] = count;
}
`;
}

// ─── TypeScript wrapper ─────────────────────────────────────────────

export interface DBSCANResult {
  /** Cluster label per point. nClusters = noise label. */
  labels: number[];
  /** Number of real clusters (excluding noise). */
  nClusters: number;
  /** Number of noise points. */
  noiseCount: number;
}

/**
 * Run DBSCAN on a 2D/3D embedding using WebGPU compute shaders.
 *
 * @param embedding  Flat Float32Array [N × nComponents] or number[][] array
 * @param nComponents  2 or 3
 * @param minPtsOverride  Optional explicit minPts (default: auto-estimated)
 * @returns  Cluster labels, cluster count, and noise count
 */
export async function dbscanGPU(
  embedding: Float32Array | number[][],
  nComponents: number,
  minPtsOverride?: number,
  epsilonMultiplier = 1.0
): Promise<DBSCANResult> {
  const device = await getDevice();
  if (!device) throw new Error('WebGPU not available');

  // ── Flatten embedding to Float32Array ──
  let flatPoints: Float32Array;
  let n: number;

  if (embedding instanceof Float32Array) {
    flatPoints = embedding;
    n = embedding.length / nComponents;
  } else {
    n = embedding.length;
    flatPoints = new Float32Array(n * nComponents);
    for (let i = 0; i < n; i++) {
      for (let d = 0; d < nComponents; d++) {
        flatPoints[i * nComponents + d] = embedding[i][d];
      }
    }
  }

  const minPts = minPtsOverride ?? Math.max(5, Math.min(15, Math.floor(n / 500)));
  const k = minPts;
  const pointsBytes = flatPoints.byteLength;
  const nBytes = n * 4;

  // ── Upload points ──
  const pointsBuffer = device.createBuffer({
    size: pointsBytes,
    usage: GPUBufferUsage.STORAGE + GPUBufferUsage.COPY_DST,
  });
  device.queue.writeBuffer(pointsBuffer, 0, flatPoints.buffer as ArrayBuffer);

  // ════════════════════════════════════════════════════════════════════
  // PASS 1a: k-NN distance estimation (all N points, not sampled)
  // ════════════════════════════════════════════════════════════════════

  const kDistsBuffer = device.createBuffer({
    size: nBytes,
    usage: GPUBufferUsage.STORAGE + GPUBufferUsage.COPY_SRC,
  });
  const kDistStaging = device.createBuffer({
    size: nBytes,
    usage: GPUBufferUsage.MAP_READ + GPUBufferUsage.COPY_DST,
  });

  const kDistParamsData = new ArrayBuffer(16);
  new Uint32Array(kDistParamsData).set([n, nComponents, k, 0]);
  const kDistParamsBuffer = device.createBuffer({
    size: 16,
    usage: GPUBufferUsage.UNIFORM + GPUBufferUsage.COPY_DST,
  });
  device.queue.writeBuffer(kDistParamsBuffer, 0, kDistParamsData);

  const kDistModule = device.createShaderModule({ code: makeKDistShader(Math.max(k, 16)) });
  const kDistBGL = device.createBindGroupLayout({
    entries: [
      { binding: 0, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'uniform' } },
      { binding: 1, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'read-only-storage' } },
      { binding: 2, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'storage' } },
    ],
  });
  const kDistPipeline = device.createComputePipeline({
    layout: device.createPipelineLayout({ bindGroupLayouts: [kDistBGL] }),
    compute: { module: kDistModule, entryPoint: 'main' },
  });
  const kDistBG = device.createBindGroup({
    layout: kDistBGL,
    entries: [
      { binding: 0, resource: { buffer: kDistParamsBuffer } },
      { binding: 1, resource: { buffer: pointsBuffer } },
      { binding: 2, resource: { buffer: kDistsBuffer } },
    ],
  });

  // For N≤100K in 2D/3D, a single dispatch is fast enough (no TDR risk).
  {
    const enc = device.createCommandEncoder();
    const pass = enc.beginComputePass();
    pass.setPipeline(kDistPipeline);
    pass.setBindGroup(0, kDistBG);
    pass.dispatchWorkgroups(Math.ceil(n / 64));
    pass.end();
    enc.copyBufferToBuffer(kDistsBuffer, 0, kDistStaging, 0, nBytes);
    device.queue.submit([enc.finish()]);
    await device.queue.onSubmittedWorkDone();
  }

  // Read back k-distances and compute epsilon on CPU
  await kDistStaging.mapAsync(GPUMapMode.READ);
  const kDistsArr = new Float32Array(kDistStaging.getMappedRange().slice(0));
  kDistStaging.unmap();

  // 90th percentile of k-NN distances, scaled by multiplier
  const sortedKDists = Array.from(kDistsArr).sort((a, b) => a - b);
  const epsilon = sortedKDists[Math.floor(sortedKDists.length * 0.9)] * epsilonMultiplier;

  // Cleanup pass 1a buffers
  kDistsBuffer.destroy();
  kDistStaging.destroy();
  kDistParamsBuffer.destroy();

  // ════════════════════════════════════════════════════════════════════
  // PASS 1b: Count epsilon-neighbors per point
  // ════════════════════════════════════════════════════════════════════

  const neighborCountsBuffer = device.createBuffer({
    size: nBytes,
    usage: GPUBufferUsage.STORAGE + GPUBufferUsage.COPY_SRC,
  });
  const neighborCountStaging = device.createBuffer({
    size: nBytes,
    usage: GPUBufferUsage.MAP_READ + GPUBufferUsage.COPY_DST,
  });

  const ncParamsData = new ArrayBuffer(16);
  const ncParamsU32 = new Uint32Array(ncParamsData);
  const ncParamsF32 = new Float32Array(ncParamsData);
  ncParamsU32[0] = n;
  ncParamsU32[1] = nComponents;
  ncParamsF32[2] = epsilon;
  ncParamsU32[3] = 0;
  const ncParamsBuffer = device.createBuffer({
    size: 16,
    usage: GPUBufferUsage.UNIFORM + GPUBufferUsage.COPY_DST,
  });
  device.queue.writeBuffer(ncParamsBuffer, 0, ncParamsData);

  const ncModule = device.createShaderModule({ code: makeNeighborCountShader() });
  const ncBGL = device.createBindGroupLayout({
    entries: [
      { binding: 0, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'uniform' } },
      { binding: 1, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'read-only-storage' } },
      { binding: 2, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'storage' } },
    ],
  });
  const ncPipeline = device.createComputePipeline({
    layout: device.createPipelineLayout({ bindGroupLayouts: [ncBGL] }),
    compute: { module: ncModule, entryPoint: 'main' },
  });
  const ncBG = device.createBindGroup({
    layout: ncBGL,
    entries: [
      { binding: 0, resource: { buffer: ncParamsBuffer } },
      { binding: 1, resource: { buffer: pointsBuffer } },
      { binding: 2, resource: { buffer: neighborCountsBuffer } },
    ],
  });

  {
    const enc = device.createCommandEncoder();
    const pass = enc.beginComputePass();
    pass.setPipeline(ncPipeline);
    pass.setBindGroup(0, ncBG);
    pass.dispatchWorkgroups(Math.ceil(n / 64));
    pass.end();
    device.queue.submit([enc.finish()]);
    await device.queue.onSubmittedWorkDone();
  }

  // ════════════════════════════════════════════════════════════════════
  // PASS 2: Label propagation (iterative connected components)
  // ════════════════════════════════════════════════════════════════════

  // Initialize labels: core points get label = i, non-core get 0xFFFFFFFF
  // We need neighborCounts on CPU to initialize labels. Read them back.
  {
    const enc = device.createCommandEncoder();
    enc.copyBufferToBuffer(neighborCountsBuffer, 0, neighborCountStaging, 0, nBytes);
    device.queue.submit([enc.finish()]);
  }
  await neighborCountStaging.mapAsync(GPUMapMode.READ);
  const neighborCountsArr = new Uint32Array(neighborCountStaging.getMappedRange().slice(0));
  neighborCountStaging.unmap();

  const initLabels = new Uint32Array(n);
  for (let i = 0; i < n; i++) {
    initLabels[i] = neighborCountsArr[i] >= minPts ? i : 0xffffffff;
  }

  const labelsBuffer = device.createBuffer({
    size: nBytes,
    usage: GPUBufferUsage.STORAGE + GPUBufferUsage.COPY_SRC + GPUBufferUsage.COPY_DST,
  });
  device.queue.writeBuffer(labelsBuffer, 0, initLabels.buffer as ArrayBuffer);

  // Atomic changed counter
  const changedBuffer = device.createBuffer({
    size: 4,
    usage: GPUBufferUsage.STORAGE + GPUBufferUsage.COPY_SRC + GPUBufferUsage.COPY_DST,
  });
  const changedStaging = device.createBuffer({
    size: 4,
    usage: GPUBufferUsage.MAP_READ + GPUBufferUsage.COPY_DST,
  });

  // Params for pass 2/3
  const lpParamsData = new ArrayBuffer(16);
  const lpParamsU32 = new Uint32Array(lpParamsData);
  const lpParamsF32 = new Float32Array(lpParamsData);
  lpParamsU32[0] = n;
  lpParamsU32[1] = nComponents;
  lpParamsF32[2] = epsilon;
  lpParamsU32[3] = minPts;
  const lpParamsBuffer = device.createBuffer({
    size: 16,
    usage: GPUBufferUsage.UNIFORM + GPUBufferUsage.COPY_DST,
  });
  device.queue.writeBuffer(lpParamsBuffer, 0, lpParamsData);

  const lpModule = device.createShaderModule({ code: makeLabelPropShader() });
  const lpBGL = device.createBindGroupLayout({
    entries: [
      { binding: 0, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'uniform' } },
      { binding: 1, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'read-only-storage' } },
      { binding: 2, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'read-only-storage' } },
      { binding: 3, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'storage' } },
      { binding: 4, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'storage' } },
    ],
  });
  const lpPipeline = device.createComputePipeline({
    layout: device.createPipelineLayout({ bindGroupLayouts: [lpBGL] }),
    compute: { module: lpModule, entryPoint: 'main' },
  });
  const lpBG = device.createBindGroup({
    layout: lpBGL,
    entries: [
      { binding: 0, resource: { buffer: lpParamsBuffer } },
      { binding: 1, resource: { buffer: pointsBuffer } },
      { binding: 2, resource: { buffer: neighborCountsBuffer } },
      { binding: 3, resource: { buffer: labelsBuffer } },
      { binding: 4, resource: { buffer: changedBuffer } },
    ],
  });

  // Iterate until convergence (max 100 iterations as safety)
  const MAX_ITERATIONS = 100;
  for (let iter = 0; iter < MAX_ITERATIONS; iter++) {
    // Reset changed counter
    device.queue.writeBuffer(changedBuffer, 0, new Uint32Array([0]));

    const enc = device.createCommandEncoder();
    const pass = enc.beginComputePass();
    pass.setPipeline(lpPipeline);
    pass.setBindGroup(0, lpBG);
    pass.dispatchWorkgroups(Math.ceil(n / 64));
    pass.end();
    enc.copyBufferToBuffer(changedBuffer, 0, changedStaging, 0, 4);
    device.queue.submit([enc.finish()]);

    await changedStaging.mapAsync(GPUMapMode.READ);
    const changedVal = new Uint32Array(changedStaging.getMappedRange().slice(0))[0];
    changedStaging.unmap();

    if (changedVal === 0) break;
  }

  // ════════════════════════════════════════════════════════════════════
  // PASS 3: Border assignment
  // ════════════════════════════════════════════════════════════════════

  const borderModule = device.createShaderModule({ code: makeBorderAssignShader() });
  const borderBGL = device.createBindGroupLayout({
    entries: [
      { binding: 0, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'uniform' } },
      { binding: 1, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'read-only-storage' } },
      { binding: 2, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'read-only-storage' } },
      { binding: 3, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'storage' } },
    ],
  });
  const borderPipeline = device.createComputePipeline({
    layout: device.createPipelineLayout({ bindGroupLayouts: [borderBGL] }),
    compute: { module: borderModule, entryPoint: 'main' },
  });
  const borderBG = device.createBindGroup({
    layout: borderBGL,
    entries: [
      { binding: 0, resource: { buffer: lpParamsBuffer } },
      { binding: 1, resource: { buffer: pointsBuffer } },
      { binding: 2, resource: { buffer: neighborCountsBuffer } },
      { binding: 3, resource: { buffer: labelsBuffer } },
    ],
  });

  {
    const enc = device.createCommandEncoder();
    const pass = enc.beginComputePass();
    pass.setPipeline(borderPipeline);
    pass.setBindGroup(0, borderBG);
    pass.dispatchWorkgroups(Math.ceil(n / 64));
    pass.end();
    device.queue.submit([enc.finish()]);
    await device.queue.onSubmittedWorkDone();
  }

  // ════════════════════════════════════════════════════════════════════
  // READBACK + REMAP LABELS
  // ════════════════════════════════════════════════════════════════════

  const labelsStaging = device.createBuffer({
    size: nBytes,
    usage: GPUBufferUsage.MAP_READ + GPUBufferUsage.COPY_DST,
  });
  {
    const enc = device.createCommandEncoder();
    enc.copyBufferToBuffer(labelsBuffer, 0, labelsStaging, 0, nBytes);
    device.queue.submit([enc.finish()]);
  }
  await labelsStaging.mapAsync(GPUMapMode.READ);
  const rawLabels = new Uint32Array(labelsStaging.getMappedRange().slice(0));
  labelsStaging.unmap();

  // Remap sparse label IDs (point indices) to dense 0..nClusters-1
  // 0xFFFFFFFF = noise
  const labelMap = new Map<number, number>();
  let nextCluster = 0;
  const labels: number[] = new Array(n);

  for (let i = 0; i < n; i++) {
    const raw = rawLabels[i];
    if (raw === 0xffffffff) {
      labels[i] = -1; // noise placeholder
    } else {
      if (!labelMap.has(raw)) {
        labelMap.set(raw, nextCluster++);
      }
      labels[i] = labelMap.get(raw)!;
    }
  }

  const nClusters = nextCluster;
  // Assign noise points the nClusters index (matches existing convention)
  let noiseCount = 0;
  for (let i = 0; i < n; i++) {
    if (labels[i] === -1) {
      labels[i] = nClusters;
      noiseCount++;
    }
  }

  // ── Cleanup ──
  pointsBuffer.destroy();
  neighborCountsBuffer.destroy();
  neighborCountStaging.destroy();
  ncParamsBuffer.destroy();
  labelsBuffer.destroy();
  changedBuffer.destroy();
  changedStaging.destroy();
  lpParamsBuffer.destroy();
  labelsStaging.destroy();

  return { labels, nClusters, noiseCount };
}
