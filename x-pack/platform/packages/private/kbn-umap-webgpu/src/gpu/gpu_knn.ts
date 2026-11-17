/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Fused GPU KNN computation — distance + top-K in a single pass.
 *
 * Each GPU thread handles one query point, computing distances to ALL N
 * reference points on-the-fly and maintaining a top-K set in thread-private
 * memory. Only the K nearest indices + distances are written to output.
 *
 * This is the same approach used by FAISS-GPU and RAPIDS cuML:
 * never materialize the N×N distance matrix.
 *
 * Memory: O(N×d + N×K) instead of O(N²)
 * For MNIST (70K × 784): ~228 MB instead of ~18 GB
 *
 * Optimization: Data dimensions are padded to multiples of 4 and accessed
 * as vec4<f32> with dot() intrinsics for ~4x fewer arithmetic instructions
 * in the distance computation inner loop.
 */

const K_MAX = 128;

function makeEuclideanKNNShader(): string {
  return /* wgsl */ `
struct Params {
  n: u32,
  dims4: u32,
  k: u32,
  queryOffset: u32,
}

@group(0) @binding(0) var<uniform> params: Params;
@group(0) @binding(1) var<storage, read> data: array<vec4<f32>>;
@group(0) @binding(2) var<storage, read_write> knnIndices: array<u32>;
@group(0) @binding(3) var<storage, read_write> knnDists: array<f32>;

@compute @workgroup_size(64)
fn main(@builtin(global_invocation_id) gid: vec3u) {
  let i = gid.x + params.queryOffset;
  let n = params.n;
  let dims4 = params.dims4;
  let k = params.k;

  if (i >= n) {
    return;
  }

  // Thread-local top-K storage (maintained as an unsorted set; max tracked separately)
  var topDist: array<f32, ${K_MAX}>;
  var topIdx: array<u32, ${K_MAX}>;

  // Initialize first K entries to +inf
  for (var ki = 0u; ki < k; ki++) {
    topDist[ki] = 1e+38;
    topIdx[ki] = 0u;
  }

  // Track current max in top-K for fast rejection
  var curMaxKi: u32 = 0u;
  var curMaxD: f32 = 1e+38;

  let iBase = i * dims4;

  // For each reference point, compute squared distance and maintain top-K
  for (var j = 0u; j < n; j++) {
    var distSq: f32 = 0.0;
    let jBase = j * dims4;
    for (var d = 0u; d < dims4; d++) {
      let diff = data[iBase + d] - data[jBase + d];
      distSq += dot(diff, diff);
    }

    // Compare squared distance against current max (avoids sqrt in inner loop)
    if (distSq < curMaxD) {
      topDist[curMaxKi] = distSq;
      topIdx[curMaxKi] = j;

      // Rescan to find new max
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

  // Sort top-K by distance (selection sort — K is small, typically 15)
  for (var a = 0u; a < k; a++) {
    var minKi = a;
    var minD = topDist[a];
    for (var b = a + 1u; b < k; b++) {
      if (topDist[b] < minD) {
        minD = topDist[b];
        minKi = b;
      }
    }
    if (minKi != a) {
      let td = topDist[a]; topDist[a] = topDist[minKi]; topDist[minKi] = td;
      let ti = topIdx[a]; topIdx[a] = topIdx[minKi]; topIdx[minKi] = ti;
    }
  }

  // Write output — apply sqrt only to the final K results
  let outBase = i * k;
  for (var ki = 0u; ki < k; ki++) {
    knnIndices[outBase + ki] = topIdx[ki];
    knnDists[outBase + ki] = sqrt(topDist[ki]);
  }
}
`;
}

function makeCosineKNNShader(): string {
  return /* wgsl */ `
struct Params {
  n: u32,
  dims4: u32,
  k: u32,
  queryOffset: u32,
}

@group(0) @binding(0) var<uniform> params: Params;
@group(0) @binding(1) var<storage, read> data: array<vec4<f32>>;
@group(0) @binding(2) var<storage, read_write> knnIndices: array<u32>;
@group(0) @binding(3) var<storage, read_write> knnDists: array<f32>;

@compute @workgroup_size(64)
fn main(@builtin(global_invocation_id) gid: vec3u) {
  let i = gid.x + params.queryOffset;
  let n = params.n;
  let dims4 = params.dims4;
  let k = params.k;

  if (i >= n) {
    return;
  }

  // Thread-local top-K storage
  var topDist: array<f32, ${K_MAX}>;
  var topIdx: array<u32, ${K_MAX}>;

  for (var ki = 0u; ki < k; ki++) {
    topDist[ki] = 1e+38;
    topIdx[ki] = 0u;
  }

  var curMaxKi: u32 = 0u;
  var curMaxD: f32 = 1e+38;

  let iBase = i * dims4;

  // Precompute norm for query point (constant across all j)
  var normISq: f32 = 0.0;
  for (var d = 0u; d < dims4; d++) {
    let vi = data[iBase + d];
    normISq += dot(vi, vi);
  }
  let normI = sqrt(normISq);

  for (var j = 0u; j < n; j++) {
    var dotProd: f32 = 0.0;
    var normJSq: f32 = 0.0;
    let jBase = j * dims4;
    for (var d = 0u; d < dims4; d++) {
      let vi = data[iBase + d];
      let vj = data[jBase + d];
      dotProd += dot(vi, vj);
      normJSq += dot(vj, vj);
    }
    let normJ = sqrt(normJSq);

    var dist: f32;
    if (normI == 0.0 && normJ == 0.0) {
      dist = 0.0;
    } else if (normI == 0.0 || normJ == 0.0) {
      dist = 1.0;
    } else {
      dist = 1.0 - dotProd / (normI * normJ);
    }

    if (dist < curMaxD) {
      topDist[curMaxKi] = dist;
      topIdx[curMaxKi] = j;

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

  // Sort top-K
  for (var a = 0u; a < k; a++) {
    var minKi = a;
    var minD = topDist[a];
    for (var b = a + 1u; b < k; b++) {
      if (topDist[b] < minD) {
        minD = topDist[b];
        minKi = b;
      }
    }
    if (minKi != a) {
      let td = topDist[a]; topDist[a] = topDist[minKi]; topDist[minKi] = td;
      let ti = topIdx[a]; topIdx[a] = topIdx[minKi]; topIdx[minKi] = ti;
    }
  }

  let outBase = i * k;
  for (var ki = 0u; ki < k; ki++) {
    knnIndices[outBase + ki] = topIdx[ki];
    knnDists[outBase + ki] = topDist[ki];
  }
}
`;
}

export type KNNMetric = 'euclidean' | 'cosine';

/**
 * Compute K nearest neighbors on the GPU in a single pass.
 *
 * Unlike the previous two-step approach (pairwise distances → KNN extraction),
 * this fuses both into one shader dispatch. Each thread computes distances to
 * all N points and maintains top-K in private memory, writing only K results.
 *
 * @param device - GPUDevice
 * @param data   - Flat Float32Array of shape [N × dims]
 * @param n      - Number of data points
 * @param dims   - Dimensionality of each point
 * @param k      - Number of nearest neighbors
 * @param metric - Distance metric ('euclidean' | 'cosine')
 * @returns { knnIndices, knnDistances } — each is number[N][K]
 */
export async function computeKNNGPU(
  device: GPUDevice,
  data: Float32Array,
  n: number,
  dims: number,
  k: number,
  metric: KNNMetric = 'euclidean',
  onProgress?: (completed: number, total: number) => void
): Promise<{ knnIndices: number[][]; knnDistances: number[][] }> {
  if (k > K_MAX) {
    throw new Error(`k (${k}) exceeds maximum supported value (${K_MAX})`);
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
  const dataSize = gpuData.byteLength;
  const maxBufferSize = device.limits.maxBufferSize;
  const maxBinding = device.limits.maxStorageBufferBindingSize;
  const effectiveLimit = Math.min(maxBufferSize, maxBinding);

  if (dataSize > effectiveLimit) {
    throw new Error(
      `Data buffer (${(dataSize / 1024 / 1024).toFixed(1)} MB) exceeds ` +
        `device storage limit (${(effectiveLimit / 1024 / 1024).toFixed(1)} MB). ` +
        `Dataset too large for single-buffer GPU KNN on this hardware.`
    );
  }

  const shaderCode = metric === 'cosine' ? makeCosineKNNShader() : makeEuclideanKNNShader();

  const shaderModule = device.createShaderModule({ code: shaderCode });

  // Params: n, dims4, k, queryOffset (4 × u32 = 16 bytes)
  const paramsBuffer = device.createBuffer({
    size: 16,
    usage: GPUBufferUsage.UNIFORM + GPUBufferUsage.COPY_DST,
  });

  // Data buffer (read-only storage)
  const dataBuffer = device.createBuffer({
    size: dataSize,
    usage: GPUBufferUsage.STORAGE + GPUBufferUsage.COPY_DST,
  });
  device.queue.writeBuffer(dataBuffer, 0, gpuData.buffer as ArrayBuffer);

  // Output buffers: N × K indices and N × K distances
  const outputSize = n * k * 4;
  const knnIndicesBuffer = device.createBuffer({
    size: outputSize,
    usage: GPUBufferUsage.STORAGE + GPUBufferUsage.COPY_SRC,
  });
  const knnDistsBuffer = device.createBuffer({
    size: outputSize,
    usage: GPUBufferUsage.STORAGE + GPUBufferUsage.COPY_SRC,
  });

  // Staging buffers for GPU → CPU readback
  const stagingIndices = device.createBuffer({
    size: outputSize,
    usage: GPUBufferUsage.MAP_READ + GPUBufferUsage.COPY_DST,
  });
  const stagingDists = device.createBuffer({
    size: outputSize,
    usage: GPUBufferUsage.MAP_READ + GPUBufferUsage.COPY_DST,
  });

  // Pipeline setup
  const bindGroupLayout = device.createBindGroupLayout({
    entries: [
      {
        binding: 0,
        visibility: GPUShaderStage.COMPUTE,
        buffer: { type: 'uniform' },
      },
      {
        binding: 1,
        visibility: GPUShaderStage.COMPUTE,
        buffer: { type: 'read-only-storage' },
      },
      {
        binding: 2,
        visibility: GPUShaderStage.COMPUTE,
        buffer: { type: 'storage' },
      },
      {
        binding: 3,
        visibility: GPUShaderStage.COMPUTE,
        buffer: { type: 'storage' },
      },
    ],
  });

  const pipelineLayout = device.createPipelineLayout({
    bindGroupLayouts: [bindGroupLayout],
  });

  const pipeline = device.createComputePipeline({
    layout: pipelineLayout,
    compute: { module: shaderModule, entryPoint: 'main' },
  });

  const bindGroup = device.createBindGroup({
    layout: bindGroupLayout,
    entries: [
      { binding: 0, resource: { buffer: paramsBuffer } },
      { binding: 1, resource: { buffer: dataBuffer } },
      { binding: 2, resource: { buffer: knnIndicesBuffer } },
      { binding: 3, resource: { buffer: knnDistsBuffer } },
    ],
  });

  // Tiled dispatch to prevent GPU timeout (TDR).
  // Each tile processes a chunk of query points; we yield between tiles.
  // Target: keep each dispatch under ~2s at 1 TFLOPS.
  const flopsPerThread = n * paddedDims * 2; // each thread scans all N points
  const TILE_SIZE = Math.min(
    n,
    Math.max(64, 2 ** Math.floor(Math.log2(2e9 / Math.max(1, flopsPerThread))))
  );
  const nTiles = Math.ceil(n / TILE_SIZE);

  for (let tile = 0; tile < nTiles; tile++) {
    const offset = tile * TILE_SIZE;
    const count = Math.min(TILE_SIZE, n - offset);

    device.queue.writeBuffer(paramsBuffer, 0, new Uint32Array([n, dims4, k, offset]));

    const enc = device.createCommandEncoder();
    const pass = enc.beginComputePass();
    pass.setPipeline(pipeline);
    pass.setBindGroup(0, bindGroup);
    pass.dispatchWorkgroups(Math.ceil(count / 64));
    pass.end();
    device.queue.submit([enc.finish()]);
    await device.queue.onSubmittedWorkDone();

    onProgress?.(Math.min(offset + count, n), n);
  }

  // Copy results to staging buffers
  const commandEncoder = device.createCommandEncoder();
  commandEncoder.copyBufferToBuffer(knnIndicesBuffer, 0, stagingIndices, 0, outputSize);
  commandEncoder.copyBufferToBuffer(knnDistsBuffer, 0, stagingDists, 0, outputSize);
  device.queue.submit([commandEncoder.finish()]);

  // Readback
  await Promise.all([
    stagingIndices.mapAsync(GPUMapMode.READ),
    stagingDists.mapAsync(GPUMapMode.READ),
  ]);

  const indicesFlat = new Uint32Array(stagingIndices.getMappedRange().slice(0));
  const distsFlat = new Float32Array(stagingDists.getMappedRange().slice(0));
  stagingIndices.unmap();
  stagingDists.unmap();

  // Convert flat arrays to 2D
  const knnIndices: number[][] = [];
  const knnDistances: number[][] = [];
  for (let i = 0; i < n; i++) {
    const indRow: number[] = [];
    const distRow: number[] = [];
    const base = i * k;
    for (let j = 0; j < k; j++) {
      indRow.push(indicesFlat[base + j]);
      distRow.push(distsFlat[base + j]);
    }
    knnIndices.push(indRow);
    knnDistances.push(distRow);
  }

  // Clean up GPU resources
  paramsBuffer.destroy();
  dataBuffer.destroy();
  knnIndicesBuffer.destroy();
  knnDistsBuffer.destroy();
  stagingIndices.destroy();
  stagingDists.destroy();

  return { knnIndices, knnDistances };
}
