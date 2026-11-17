/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * WebGPU-accelerated SGD optimization for UMAP embedding.
 *
 * The embedding lives entirely on the GPU. Each epoch dispatches a single
 * compute shader that handles both attractive and repulsive (negative sampling)
 * forces and updates the embedding in-place.
 *
 * Readback to CPU is only performed on demand (for visualization or final result).
 * This avoids GPU↔CPU round-trips per epoch.
 *
 * Race conditions on embedding writes are acceptable — this is Hogwild!-style
 * asynchronous SGD, which is well-studied and converges for problems like UMAP.
 * (Same approach used by RAPIDS cuML GPU UMAP.)
 */

const SGD_FULL_SHADER = /* wgsl */ `
struct Params {
  nEdges: u32,
  dim: u32,
  nVertices: u32,
  moveOther: u32,
  alpha: f32,
  a: f32,
  b: f32,
  gamma: f32,
  clipValue: f32,
  currentEpoch: f32,
  negativeSampleRate: u32,
  _pad: u32,
}

@group(0) @binding(0) var<uniform> params: Params;
@group(0) @binding(1) var<storage, read> head: array<u32>;
@group(0) @binding(2) var<storage, read> tail: array<u32>;
@group(0) @binding(3) var<storage, read> epochsPerSample: array<f32>;
@group(0) @binding(4) var<storage, read_write> epochOfNextSample: array<f32>;
@group(0) @binding(5) var<storage, read> epochsPerNegSample: array<f32>;
@group(0) @binding(6) var<storage, read_write> epochOfNextNegSample: array<f32>;
@group(0) @binding(7) var<storage, read_write> embedding: array<f32>;

// PCG-style hash for pseudo-random negative sample indices
// From Jarzynski & Olano, "Hash Functions for GPU Rendering", JCGT 2020 (https://jcgt.org/published/0009/03/02/)
fn pcg_hash(input: u32) -> u32 {
  var state = input * 747796405u + 2891336453u;
  var word = ((state >> ((state >> 28u) + 4u)) ^ state) * 277803737u;
  return (word >> 22u) ^ word;
}

fn rand_index(seed: u32, n: u32) -> u32 {
  return pcg_hash(seed) % n;
}

@compute @workgroup_size(256)
fn main(@builtin(global_invocation_id) gid: vec3u) {
  let edgeIdx = gid.x;
  if (edgeIdx >= params.nEdges) {
    return;
  }

  let epoch = params.currentEpoch;

  // ── Check if this edge should be sampled this epoch ──
  if (epochOfNextSample[edgeIdx] > epoch) {
    return;
  }

  let j = head[edgeIdx];
  let k = tail[edgeIdx];
  let dim = params.dim;
  let alpha = params.alpha;

  // ── Attractive force ──
  var distSquared: f32 = 0.0;
  for (var d: u32 = 0u; d < dim; d = d + 1u) {
    let diff = embedding[j * dim + d] - embedding[k * dim + d];
    distSquared = distSquared + diff * diff;
  }

  var gradCoeff: f32 = 0.0;
  if (distSquared > 0.0) {
    gradCoeff = -2.0 * params.a * params.b * pow(distSquared, params.b - 1.0);
    gradCoeff = gradCoeff / (params.a * pow(distSquared, params.b) + 1.0);
  }

  for (var d: u32 = 0u; d < dim; d = d + 1u) {
    let diff = embedding[j * dim + d] - embedding[k * dim + d];
    var grad: f32 = clamp(gradCoeff * diff, -params.clipValue, params.clipValue);
    embedding[j * dim + d] = embedding[j * dim + d] + grad * alpha;
    if (params.moveOther != 0u) {
      embedding[k * dim + d] = embedding[k * dim + d] - grad * alpha;
    }
  }

  // Advance epoch schedule for this edge
  epochOfNextSample[edgeIdx] = epochOfNextSample[edgeIdx] + epochsPerSample[edgeIdx];

  // ── Repulsive forces (negative sampling) ──
  let nNegSamples = u32(floor(
    (epoch - epochOfNextNegSample[edgeIdx]) / epochsPerNegSample[edgeIdx]
  ));

  // Seed the PRNG: combine epoch + edgeIdx for unique sequence per edge per epoch
  let baseSeed = u32(epoch) * 1000003u + edgeIdx * 7u;

  for (var p: u32 = 0u; p < nNegSamples; p = p + 1u) {
    let negIdx = rand_index(baseSeed + p * 13u, params.nVertices);

    // Skip self
    if (negIdx == j) {
      continue;
    }

    var negDistSq: f32 = 0.0;
    for (var d: u32 = 0u; d < dim; d = d + 1u) {
      let diff = embedding[j * dim + d] - embedding[negIdx * dim + d];
      negDistSq = negDistSq + diff * diff;
    }

    var negGradCoeff: f32 = 0.0;
    if (negDistSq > 0.0) {
      negGradCoeff = 2.0 * params.gamma * params.b;
      negGradCoeff = negGradCoeff / ((0.001 + negDistSq) * (params.a * pow(negDistSq, params.b) + 1.0));
    }

    for (var d: u32 = 0u; d < dim; d = d + 1u) {
      var grad: f32 = 4.0;
      if (negGradCoeff > 0.0) {
        let diff = embedding[j * dim + d] - embedding[negIdx * dim + d];
        grad = clamp(negGradCoeff * diff, -params.clipValue, params.clipValue);
      }
      embedding[j * dim + d] = embedding[j * dim + d] + grad * alpha;
    }
  }

  // Advance negative sample schedule
  epochOfNextNegSample[edgeIdx] = epochOfNextNegSample[edgeIdx]
    + f32(nNegSamples) * epochsPerNegSample[edgeIdx];
}
`;

// ── Params struct layout (must match WGSL struct exactly) ──
// Total: 48 bytes (12 x 4-byte fields)
const PARAMS_SIZE = 48;

function writeParams(
  buf: ArrayBuffer,
  p: {
    nEdges: number;
    dim: number;
    nVertices: number;
    moveOther: boolean;
    alpha: number;
    a: number;
    b: number;
    gamma: number;
    clipValue: number;
    currentEpoch: number;
    negativeSampleRate: number;
  }
): void {
  const u = new Uint32Array(buf);
  const f = new Float32Array(buf);
  u[0] = p.nEdges;
  u[1] = p.dim;
  u[2] = p.nVertices;
  u[3] = p.moveOther ? 1 : 0;
  f[4] = p.alpha;
  f[5] = p.a;
  f[6] = p.b;
  f[7] = p.gamma;
  f[8] = p.clipValue;
  f[9] = p.currentEpoch;
  u[10] = p.negativeSampleRate;
  u[11] = 0; // padding
}

/**
 * Configuration for initializing the GPU SGD optimizer.
 */
export interface GPUSGDConfig {
  /** Flat embedding array [nPoints * dim] */
  embedding: Float32Array;
  /** Edge head indices */
  head: Uint32Array;
  /** Edge tail indices */
  tail: Uint32Array;
  /** Epochs between samples for each edge */
  epochsPerSample: Float32Array;
  /** Next epoch to sample each edge */
  epochOfNextSample: Float32Array;
  /** Epochs between negative samples for each edge */
  epochsPerNegSample: Float32Array;
  /** Next epoch for negative sample of each edge */
  epochOfNextNegSample: Float32Array;

  nEdges: number;
  nPoints: number;
  dim: number;
  nVertices: number;
  a: number;
  b: number;
  gamma: number;
  initialAlpha: number;
  nEpochs: number;
  moveOther: boolean;
  negativeSampleRate: number;
}

/**
 * GPU SGD Optimizer — keeps the embedding on the GPU and dispatches
 * compute shaders for each epoch. No GPU↔CPU transfer until readback.
 */
export class GPUSGDOptimizer {
  private device: GPUDevice;
  private pipeline: GPUComputePipeline;
  private bindGroup: GPUBindGroup;

  private paramsBuffer: GPUBuffer;
  private embeddingBuffer: GPUBuffer;
  private epochOfNextSampleBuffer: GPUBuffer;
  private epochOfNextNegSampleBuffer: GPUBuffer;
  private stagingBuffer: GPUBuffer;

  // Keep references for cleanup
  private headBuffer: GPUBuffer;
  private tailBuffer: GPUBuffer;
  private epsBuffer: GPUBuffer;
  private epnsBuffer: GPUBuffer;

  private config: GPUSGDConfig;
  private embeddingByteSize: number;
  private workgroupCount: number;
  private paramsData: ArrayBuffer;
  private destroyed = false;

  constructor(device: GPUDevice, config: GPUSGDConfig) {
    this.device = device;
    this.config = config;
    this.embeddingByteSize = config.embedding.byteLength;
    this.workgroupCount = Math.ceil(config.nEdges / 256);
    this.paramsData = new ArrayBuffer(PARAMS_SIZE);

    const shaderModule = device.createShaderModule({ code: SGD_FULL_SHADER });

    // ── Create buffers ──

    this.paramsBuffer = device.createBuffer({
      size: PARAMS_SIZE,
      usage: GPUBufferUsage.UNIFORM + GPUBufferUsage.COPY_DST,
    });

    this.headBuffer = this.createStorageBuffer(config.head, true);
    this.tailBuffer = this.createStorageBuffer(config.tail, true);
    this.epsBuffer = this.createStorageBuffer(config.epochsPerSample, true);

    this.epochOfNextSampleBuffer = this.createStorageBuffer(config.epochOfNextSample, false);
    this.epnsBuffer = this.createStorageBuffer(config.epochsPerNegSample, true);
    this.epochOfNextNegSampleBuffer = this.createStorageBuffer(config.epochOfNextNegSample, false);

    this.embeddingBuffer = device.createBuffer({
      size: this.embeddingByteSize,
      usage: GPUBufferUsage.STORAGE + GPUBufferUsage.COPY_DST + GPUBufferUsage.COPY_SRC,
    });
    device.queue.writeBuffer(this.embeddingBuffer, 0, config.embedding.buffer as ArrayBuffer);

    this.stagingBuffer = device.createBuffer({
      size: this.embeddingByteSize,
      usage: GPUBufferUsage.MAP_READ + GPUBufferUsage.COPY_DST,
    });

    // ── Pipeline & bind group ──

    const bindGroupLayout = device.createBindGroupLayout({
      entries: [
        { binding: 0, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'uniform' } },
        { binding: 1, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'read-only-storage' } },
        { binding: 2, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'read-only-storage' } },
        { binding: 3, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'read-only-storage' } },
        { binding: 4, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'storage' } },
        { binding: 5, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'read-only-storage' } },
        { binding: 6, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'storage' } },
        { binding: 7, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'storage' } },
      ],
    });

    this.pipeline = device.createComputePipeline({
      layout: device.createPipelineLayout({ bindGroupLayouts: [bindGroupLayout] }),
      compute: { module: shaderModule, entryPoint: 'main' },
    });

    this.bindGroup = device.createBindGroup({
      layout: bindGroupLayout,
      entries: [
        { binding: 0, resource: { buffer: this.paramsBuffer } },
        { binding: 1, resource: { buffer: this.headBuffer } },
        { binding: 2, resource: { buffer: this.tailBuffer } },
        { binding: 3, resource: { buffer: this.epsBuffer } },
        { binding: 4, resource: { buffer: this.epochOfNextSampleBuffer } },
        { binding: 5, resource: { buffer: this.epnsBuffer } },
        { binding: 6, resource: { buffer: this.epochOfNextNegSampleBuffer } },
        { binding: 7, resource: { buffer: this.embeddingBuffer } },
      ],
    });
  }

  /**
   * Run a single SGD epoch on the GPU. Very cheap — just a uniform write + dispatch.
   * No GPU→CPU readback occurs.
   */
  step(currentEpoch: number, alpha: number): void {
    if (this.destroyed) throw new Error('Optimizer has been destroyed');

    writeParams(this.paramsData, {
      nEdges: this.config.nEdges,
      dim: this.config.dim,
      nVertices: this.config.nVertices,
      moveOther: this.config.moveOther,
      alpha,
      a: this.config.a,
      b: this.config.b,
      gamma: this.config.gamma,
      clipValue: 4.0,
      currentEpoch,
      negativeSampleRate: this.config.negativeSampleRate,
    });

    this.device.queue.writeBuffer(this.paramsBuffer, 0, this.paramsData);

    const commandEncoder = this.device.createCommandEncoder();
    const pass = commandEncoder.beginComputePass();
    pass.setPipeline(this.pipeline);
    pass.setBindGroup(0, this.bindGroup);
    pass.dispatchWorkgroups(this.workgroupCount);
    pass.end();
    this.device.queue.submit([commandEncoder.finish()]);
  }

  /**
   * Run multiple epochs on the GPU without any readback.
   * This batches work to minimize JS↔GPU overhead.
   *
   * @param startEpoch - First epoch number
   * @param count - Number of epochs to run
   * @param initialAlpha - Learning rate at epoch 0
   * @param nEpochs - Total epochs (for alpha decay)
   * @returns The epoch number after the last step
   */
  runEpochs(startEpoch: number, count: number, initialAlpha: number, nEpochs: number): number {
    if (this.destroyed) throw new Error('Optimizer has been destroyed');

    for (let i = 0; i < count; i++) {
      const epoch = startEpoch + i;
      if (epoch >= nEpochs) return epoch;
      const alpha = initialAlpha * (1.0 - epoch / nEpochs);
      this.step(epoch, alpha);
    }
    return startEpoch + count;
  }

  /**
   * Read the embedding back from GPU to CPU.
   * This is the only operation that blocks on a GPU→CPU transfer.
   */
  async readback(): Promise<Float32Array> {
    if (this.destroyed) throw new Error('Optimizer has been destroyed');

    const commandEncoder = this.device.createCommandEncoder();
    commandEncoder.copyBufferToBuffer(
      this.embeddingBuffer,
      0,
      this.stagingBuffer,
      0,
      this.embeddingByteSize
    );
    this.device.queue.submit([commandEncoder.finish()]);

    await this.stagingBuffer.mapAsync(GPUMapMode.READ);
    const result = new Float32Array(this.stagingBuffer.getMappedRange().slice(0));
    this.stagingBuffer.unmap();
    return result;
  }

  /**
   * Release all GPU resources.
   */
  destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;

    this.paramsBuffer.destroy();
    this.headBuffer.destroy();
    this.tailBuffer.destroy();
    this.epsBuffer.destroy();
    this.epochOfNextSampleBuffer.destroy();
    this.epnsBuffer.destroy();
    this.epochOfNextNegSampleBuffer.destroy();
    this.embeddingBuffer.destroy();
    this.stagingBuffer.destroy();
  }

  // ── Helpers ──

  private createStorageBuffer(data: Float32Array | Uint32Array, readOnly: boolean): GPUBuffer {
    const usage = readOnly
      ? GPUBufferUsage.STORAGE + GPUBufferUsage.COPY_DST
      : GPUBufferUsage.STORAGE + GPUBufferUsage.COPY_DST + GPUBufferUsage.COPY_SRC;
    const buffer = this.device.createBuffer({ size: data.byteLength, usage });
    this.device.queue.writeBuffer(buffer, 0, data.buffer as ArrayBuffer);
    return buffer;
  }
}
