/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * GPU-accelerated NN-Descent for approximate k-nearest neighbor graph construction.
 *
 * Instead of brute-force O(N²) distance computation, NN-Descent iteratively
 * refines a random KNN graph by examining neighbors-of-neighbors. Each iteration
 * does O(N·K²) work, and typically converges in 10-15 iterations.
 *
 * For 70K points with K=15:
 *   Brute-force: 70K × 70K = 4.9 billion distance computations
 *   NN-Descent:  70K × 15² × 12 iters ≈ 189 million (26× less work)
 *
 * Optimizations over naive NN-Descent:
 * - 3× oversampled random initialization for a better starting graph
 * - Random exploration each iteration to escape local optima
 * - vec4 memory access for 4-wide SIMD distance computation
 *
 * Each GPU dispatch processes a tile of points to avoid GPU timeout (TDR).
 *
 * The algorithm reads neighbors-of-neighbors from a shared mutable KNN graph.
 * Concurrent reads of stale data are acceptable (Hogwild!-style) and the
 * algorithm converges regardless, which is the same approach used by
 * RAPIDS cuVS GPU nn-descent.
 */

const K_MAX = 64;
const OVERSAMPLE = 3;

// ── Shaders ──────────────────────────────────────────────────

function makeInitShader(): string {
  return /* wgsl */ `
struct Params {
  n: u32,
  dims4: u32,
  k: u32,
  queryOffset: u32,
  tileSize: u32,
  seed: u32,
  _pad0: u32,
  _pad1: u32,
}

@group(0) @binding(0) var<uniform> params: Params;
@group(0) @binding(1) var<storage, read> data: array<vec4<f32>>;
@group(0) @binding(2) var<storage, read_write> knnIdx: array<u32>;
@group(0) @binding(3) var<storage, read_write> knnDst: array<f32>;

// From Jarzynski & Olano, "Hash Functions for GPU Rendering", JCGT 2020 (https://jcgt.org/published/0009/03/02/)
fn pcg(v: u32) -> u32 {
  var s = v * 747796405u + 2891336453u;
  var w = ((s >> ((s >> 28u) + 4u)) ^ s) * 277803737u;
  return (w >> 22u) ^ w;
}

@compute @workgroup_size(64)
fn main(@builtin(global_invocation_id) gid: vec3u) {
  let local = gid.x;
  if (local >= params.tileSize) { return; }
  let i = local + params.queryOffset;
  if (i >= params.n) { return; }

  let n = params.n;
  let dims4 = params.dims4;
  let k = params.k;
  let iBase = i * dims4;

  var seed = pcg(i ^ params.seed);

  // Top-K storage maintained as a max-tracked set
  var topIdx: array<u32, ${K_MAX}>;
  var topDst: array<f32, ${K_MAX}>;

  for (var ki = 0u; ki < k; ki++) {
    topIdx[ki] = 0xFFFFFFFFu;
    topDst[ki] = 1e+38;
  }

  var curMaxKi: u32 = 0u;
  var curMaxD: f32 = 1e+38;

  // Oversample: try OVERSAMPLE*k random candidates, keep best k.
  // This gives a much better starting graph and reduces iterations needed.
  let nSamples = k * ${OVERSAMPLE}u;
  for (var s = 0u; s < nSamples; s++) {
    seed = pcg(seed);
    var j = seed % n;
    // Avoid self
    if (j == i) { j = (j + 1u) % n; }

    // Skip if already in top-K
    var isDup = false;
    for (var ki = 0u; ki < k; ki++) {
      if (topIdx[ki] == j) { isDup = true; break; }
    }
    if (isDup) { continue; }

    // Squared Euclidean distance via vec4 dot products
    var distSq: f32 = 0.0;
    let jBase = j * dims4;
    for (var d = 0u; d < dims4; d++) {
      let diff = data[iBase + d] - data[jBase + d];
      distSq += dot(diff, diff);
    }
    let dist = sqrt(distSq);

    // Insert into top-K if better than current worst
    if (dist < curMaxD) {
      topDst[curMaxKi] = dist;
      topIdx[curMaxKi] = j;

      // Rescan for new worst
      curMaxKi = 0u;
      curMaxD = topDst[0];
      for (var ki = 1u; ki < k; ki++) {
        if (topDst[ki] > curMaxD) {
          curMaxD = topDst[ki];
          curMaxKi = ki;
        }
      }
    }
  }

  // Selection sort by distance (K is small)
  for (var a = 0u; a < k; a++) {
    var minK = a;
    var minD = topDst[a];
    for (var b = a + 1u; b < k; b++) {
      if (topDst[b] < minD) { minD = topDst[b]; minK = b; }
    }
    if (minK != a) {
      let td = topDst[a]; topDst[a] = topDst[minK]; topDst[minK] = td;
      let ti = topIdx[a]; topIdx[a] = topIdx[minK]; topIdx[minK] = ti;
    }
  }

  // Write to global
  let base = i * k;
  for (var ki = 0u; ki < k; ki++) {
    knnIdx[base + ki] = topIdx[ki];
    knnDst[base + ki] = topDst[ki];
  }
}
`;
}

function makeStepShader(): string {
  return /* wgsl */ `
struct Params {
  n: u32,
  dims4: u32,
  k: u32,
  queryOffset: u32,
  tileSize: u32,
  seed: u32,
  _pad0: u32,
  _pad1: u32,
}

@group(0) @binding(0) var<uniform> params: Params;
@group(0) @binding(1) var<storage, read> data: array<vec4<f32>>;
@group(0) @binding(2) var<storage, read_write> knnIdx: array<u32>;
@group(0) @binding(3) var<storage, read_write> knnDst: array<f32>;
@group(0) @binding(4) var<storage, read_write> counter: array<atomic<u32>>;

// From Jarzynski & Olano, "Hash Functions for GPU Rendering", JCGT 2020 (https://jcgt.org/published/0009/03/02/)
fn pcg(v: u32) -> u32 {
  var s = v * 747796405u + 2891336453u;
  var w = ((s >> ((s >> 28u) + 4u)) ^ s) * 277803737u;
  return (w >> 22u) ^ w;
}

@compute @workgroup_size(64)
fn main(@builtin(global_invocation_id) gid: vec3u) {
  let local = gid.x;
  if (local >= params.tileSize) { return; }
  let i = local + params.queryOffset;
  if (i >= params.n) { return; }

  let n = params.n;
  let dims4 = params.dims4;
  let k = params.k;
  let iBase = i * dims4;
  let rowBase = i * k;

  // Load my current neighbors into private memory
  var myIdx: array<u32, ${K_MAX}>;
  var myDst: array<f32, ${K_MAX}>;

  for (var ki = 0u; ki < k; ki++) {
    myIdx[ki] = knnIdx[rowBase + ki];
    myDst[ki] = knnDst[rowBase + ki];
  }

  // Track the worst (largest) distance in our set
  var worstKi: u32 = 0u;
  var worstD: f32 = myDst[0];
  for (var ki = 1u; ki < k; ki++) {
    if (myDst[ki] > worstD) { worstD = myDst[ki]; worstKi = ki; }
  }

  var updates: u32 = 0u;

  // ── Phase 1: Neighbor-of-neighbor exploration ──
  // For each of my neighbors j, examine j's neighbors as candidates
  for (var ni = 0u; ni < k; ni++) {
    let j = myIdx[ni];
    let jRow = j * k;

    for (var nj = 0u; nj < k; nj++) {
      let c = knnIdx[jRow + nj]; // candidate (neighbor-of-neighbor)

      // Skip self
      if (c == i) { continue; }

      // Skip if already in our list
      var already = false;
      for (var chk = 0u; chk < k; chk++) {
        if (myIdx[chk] == c) { already = true; break; }
      }
      if (already) { continue; }

      // Compute distance(i, c) using vec4 dot products
      var distSq: f32 = 0.0;
      let cBase = c * dims4;
      for (var d = 0u; d < dims4; d++) {
        let diff = data[iBase + d] - data[cBase + d];
        distSq += dot(diff, diff);
      }
      let dist = sqrt(distSq);

      // If better than worst in our set, replace
      if (dist < worstD) {
        myIdx[worstKi] = c;
        myDst[worstKi] = dist;
        updates += 1u;

        // Rescan for new worst
        worstKi = 0u;
        worstD = myDst[0];
        for (var ki = 1u; ki < k; ki++) {
          if (myDst[ki] > worstD) { worstD = myDst[ki]; worstKi = ki; }
        }
      }
    }
  }

  // ── Phase 2: Random exploration (escape local optima) ──
  // Try k random candidates to discover distant good neighbors
  // that neighbor-of-neighbor chains can't reach.
  var rng = pcg(i ^ params.seed);
  for (var r = 0u; r < k; r++) {
    rng = pcg(rng);
    let c = rng % n;
    if (c == i) { continue; }

    var already = false;
    for (var chk = 0u; chk < k; chk++) {
      if (myIdx[chk] == c) { already = true; break; }
    }
    if (already) { continue; }

    var distSq: f32 = 0.0;
    let cBase = c * dims4;
    for (var d = 0u; d < dims4; d++) {
      let diff = data[iBase + d] - data[cBase + d];
      distSq += dot(diff, diff);
    }
    let dist = sqrt(distSq);

    if (dist < worstD) {
      myIdx[worstKi] = c;
      myDst[worstKi] = dist;
      updates += 1u;

      worstKi = 0u;
      worstD = myDst[0];
      for (var ki = 1u; ki < k; ki++) {
        if (myDst[ki] > worstD) { worstD = myDst[ki]; worstKi = ki; }
      }
    }
  }

  // Write back if we made any updates
  if (updates > 0u) {
    // Sort by distance before writing back
    for (var a = 0u; a < k; a++) {
      var minK = a;
      var minD = myDst[a];
      for (var b = a + 1u; b < k; b++) {
        if (myDst[b] < minD) { minD = myDst[b]; minK = b; }
      }
      if (minK != a) {
        let td = myDst[a]; myDst[a] = myDst[minK]; myDst[minK] = td;
        let ti = myIdx[a]; myIdx[a] = myIdx[minK]; myIdx[minK] = ti;
      }
    }

    for (var ki = 0u; ki < k; ki++) {
      knnIdx[rowBase + ki] = myIdx[ki];
      knnDst[rowBase + ki] = myDst[ki];
    }

    atomicAdd(&counter[0], updates);
  }
}
`;
}

// ── Host code ────────────────────────────────────────────────

export interface NNDescentProgress {
  phase: 'init' | 'iteration';
  current: number;
  total: number;
}

/**
 * Compute approximate K nearest neighbors on GPU using NN-Descent.
 *
 * Scales to large datasets (50K-100K+) without GPU timeout, unlike
 * brute-force which is O(N²) and causes TDR at ~10K+ points.
 */
export async function computeKNNNNDescent(
  device: GPUDevice,
  data: Float32Array,
  n: number,
  dims: number,
  k: number,
  onProgress?: (p: NNDescentProgress) => void
): Promise<{ knnIndices: number[][]; knnDistances: number[][] }> {
  if (k > K_MAX) {
    throw new Error(`k (${k}) exceeds maximum supported (${K_MAX})`);
  }

  // Pad dimensions to multiple of 4 for vec4 memory access in shaders
  const paddedDims = Math.ceil(dims / 4) * 4;
  const dims4 = paddedDims / 4;
  let gpuData: Float32Array;
  if (paddedDims === dims) {
    gpuData = data;
  } else {
    gpuData = new Float32Array(n * paddedDims);
    for (let i = 0; i < n; i++) {
      gpuData.set(data.subarray(i * dims, i * dims + dims), i * paddedDims);
    }
  }

  // Validate buffer sizes against device limits
  const dataByteSize = gpuData.byteLength;
  const maxBuffer = Math.min(
    device.limits.maxBufferSize,
    device.limits.maxStorageBufferBindingSize
  );
  if (dataByteSize > maxBuffer) {
    throw new Error(
      `Data (${(dataByteSize / 1e6).toFixed(0)} MB) exceeds GPU limit ` +
        `(${(maxBuffer / 1e6).toFixed(0)} MB).`
    );
  }

  const nIters = Math.max(8, Math.min(20, Math.ceil(Math.log2(n))));
  const delta = 0.001;

  // Dynamic tile size: keep each dispatch under ~2 seconds at 1 TFLOPS
  const flopsPerThread = k * k * paddedDims * 2;
  const tileSize = Math.min(n, Math.max(256, 2 ** Math.floor(Math.log2(2e9 / flopsPerThread))));
  const nTiles = Math.ceil(n / tileSize);

  // ── Create GPU buffers ──
  const knnByteSize = n * k * 4;

  const paramsBuffer = device.createBuffer({
    size: 32, // 8 x u32
    usage: GPUBufferUsage.UNIFORM + GPUBufferUsage.COPY_DST,
  });

  const dataBuffer = device.createBuffer({
    size: dataByteSize,
    usage: GPUBufferUsage.STORAGE + GPUBufferUsage.COPY_DST,
  });
  device.queue.writeBuffer(dataBuffer, 0, gpuData.buffer as ArrayBuffer);

  const knnIdxBuffer = device.createBuffer({
    size: knnByteSize,
    usage: GPUBufferUsage.STORAGE + GPUBufferUsage.COPY_DST + GPUBufferUsage.COPY_SRC,
  });

  const knnDstBuffer = device.createBuffer({
    size: knnByteSize,
    usage: GPUBufferUsage.STORAGE + GPUBufferUsage.COPY_DST + GPUBufferUsage.COPY_SRC,
  });

  const counterBuffer = device.createBuffer({
    size: 4,
    usage: GPUBufferUsage.STORAGE + GPUBufferUsage.COPY_DST + GPUBufferUsage.COPY_SRC,
  });

  const counterStaging = device.createBuffer({
    size: 4,
    usage: GPUBufferUsage.MAP_READ + GPUBufferUsage.COPY_DST,
  });

  const stagingIdx = device.createBuffer({
    size: knnByteSize,
    usage: GPUBufferUsage.MAP_READ + GPUBufferUsage.COPY_DST,
  });

  const stagingDst = device.createBuffer({
    size: knnByteSize,
    usage: GPUBufferUsage.MAP_READ + GPUBufferUsage.COPY_DST,
  });

  // ── Create pipelines ──

  // Shared bind group layout for both init and step (step has one extra binding)
  const initLayout = device.createBindGroupLayout({
    entries: [
      { binding: 0, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'uniform' } },
      { binding: 1, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'read-only-storage' } },
      { binding: 2, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'storage' } },
      { binding: 3, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'storage' } },
    ],
  });

  const stepLayout = device.createBindGroupLayout({
    entries: [
      { binding: 0, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'uniform' } },
      { binding: 1, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'read-only-storage' } },
      { binding: 2, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'storage' } },
      { binding: 3, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'storage' } },
      { binding: 4, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'storage' } },
    ],
  });

  const initPipeline = device.createComputePipeline({
    layout: device.createPipelineLayout({ bindGroupLayouts: [initLayout] }),
    compute: {
      module: device.createShaderModule({ code: makeInitShader() }),
      entryPoint: 'main',
    },
  });

  const stepPipeline = device.createComputePipeline({
    layout: device.createPipelineLayout({ bindGroupLayouts: [stepLayout] }),
    compute: {
      module: device.createShaderModule({ code: makeStepShader() }),
      entryPoint: 'main',
    },
  });

  const initBindGroup = device.createBindGroup({
    layout: initLayout,
    entries: [
      { binding: 0, resource: { buffer: paramsBuffer } },
      { binding: 1, resource: { buffer: dataBuffer } },
      { binding: 2, resource: { buffer: knnIdxBuffer } },
      { binding: 3, resource: { buffer: knnDstBuffer } },
    ],
  });

  const stepBindGroup = device.createBindGroup({
    layout: stepLayout,
    entries: [
      { binding: 0, resource: { buffer: paramsBuffer } },
      { binding: 1, resource: { buffer: dataBuffer } },
      { binding: 2, resource: { buffer: knnIdxBuffer } },
      { binding: 3, resource: { buffer: knnDstBuffer } },
      { binding: 4, resource: { buffer: counterBuffer } },
    ],
  });

  // ── Phase 1: Initialize KNN graph with oversampled random candidates ──

  const seed = 42;
  for (let tile = 0; tile < nTiles; tile++) {
    const offset = tile * tileSize;
    const count = Math.min(tileSize, n - offset);

    const params = new Uint32Array([n, dims4, k, offset, count, seed, 0, 0]);
    device.queue.writeBuffer(paramsBuffer, 0, params);

    const enc = device.createCommandEncoder();
    const pass = enc.beginComputePass();
    pass.setPipeline(initPipeline);
    pass.setBindGroup(0, initBindGroup);
    pass.dispatchWorkgroups(Math.ceil(count / 64));
    pass.end();
    device.queue.submit([enc.finish()]);
    await device.queue.onSubmittedWorkDone();

    onProgress?.({ phase: 'init', current: tile + 1, total: nTiles });
  }

  // ── Phase 2: NN-Descent iterations ──

  for (let iter = 0; iter < nIters; iter++) {
    // Reset update counter
    device.queue.writeBuffer(counterBuffer, 0, new Uint32Array([0]));

    // Vary seed per iteration for random exploration diversity
    const iterSeed = (iter + 1) * 1000003 + 42;

    for (let tile = 0; tile < nTiles; tile++) {
      const offset = tile * tileSize;
      const count = Math.min(tileSize, n - offset);

      const params = new Uint32Array([n, dims4, k, offset, count, iterSeed, 0, 0]);
      device.queue.writeBuffer(paramsBuffer, 0, params);

      const enc = device.createCommandEncoder();
      const pass = enc.beginComputePass();
      pass.setPipeline(stepPipeline);
      pass.setBindGroup(0, stepBindGroup);
      pass.dispatchWorkgroups(Math.ceil(count / 64));
      pass.end();
      device.queue.submit([enc.finish()]);
      await device.queue.onSubmittedWorkDone();
    }

    // Read back update count for convergence check
    const enc = device.createCommandEncoder();
    enc.copyBufferToBuffer(counterBuffer, 0, counterStaging, 0, 4);
    device.queue.submit([enc.finish()]);
    await counterStaging.mapAsync(GPUMapMode.READ);
    const updateCount = new Uint32Array(counterStaging.getMappedRange().slice(0))[0];
    counterStaging.unmap();

    onProgress?.({ phase: 'iteration', current: iter + 1, total: nIters });

    // Convergence: stop if updates < delta * N * K
    if (updateCount < delta * n * k) {
      break;
    }
  }

  // ── Phase 3: Read back results ──

  const enc = device.createCommandEncoder();
  enc.copyBufferToBuffer(knnIdxBuffer, 0, stagingIdx, 0, knnByteSize);
  enc.copyBufferToBuffer(knnDstBuffer, 0, stagingDst, 0, knnByteSize);
  device.queue.submit([enc.finish()]);

  await Promise.all([stagingIdx.mapAsync(GPUMapMode.READ), stagingDst.mapAsync(GPUMapMode.READ)]);

  const flatIdx = new Uint32Array(stagingIdx.getMappedRange().slice(0));
  const flatDst = new Float32Array(stagingDst.getMappedRange().slice(0));
  stagingIdx.unmap();
  stagingDst.unmap();

  // Convert to 2D arrays
  const knnIndices: number[][] = [];
  const knnDistances: number[][] = [];
  for (let i = 0; i < n; i++) {
    const base = i * k;
    const idxRow: number[] = [];
    const dstRow: number[] = [];
    for (let j = 0; j < k; j++) {
      idxRow.push(flatIdx[base + j]);
      dstRow.push(flatDst[base + j]);
    }
    knnIndices.push(idxRow);
    knnDistances.push(dstRow);
  }

  // ── Cleanup ──

  paramsBuffer.destroy();
  dataBuffer.destroy();
  knnIdxBuffer.destroy();
  knnDstBuffer.destroy();
  counterBuffer.destroy();
  counterStaging.destroy();
  stagingIdx.destroy();
  stagingDst.destroy();

  return { knnIndices, knnDistances };
}
