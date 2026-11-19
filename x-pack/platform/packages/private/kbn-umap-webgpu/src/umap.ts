/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/*
 * @notice
 *
 * Portions of @kbn/umap-webgpu (umap.ts, heap.ts, matrix.ts, nn_descent.ts, tree.ts,
 * utils.ts, distance.ts, distances.ts, optimization_state.ts and types.ts) are
 * ported from umap-js https://github.com/PAIR-code/umap-js and have been
 * modified by Elastic (WebGPU acceleration, refactoring and additional options).
 *
 * Copyright 2019 Google LLC. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 * umap-js is a reimplementation of the Python UMAP implementation by
 * Leland McInnes https://github.com/lmcinnes/umap, which is available under
 * the following license:
 *
 * BSD 3-Clause License
 *
 * Copyright (c) 2017, Leland McInnes
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are met:
 *
 * * Redistributions of source code must retain the above copyright notice, this
 *   list of conditions and the following disclaimer.
 *
 * * Redistributions in binary form must reproduce the above copyright notice,
 *   this list of conditions and the following disclaimer in the documentation
 *   and/or other materials provided with the distribution.
 *
 * * Neither the name of the copyright holder nor the names of its
 *   contributors may be used to endorse or promote products derived from
 *   this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
 * AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
 * IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
 * DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE
 * FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL
 * DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR
 * SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER
 * CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY,
 * OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
 * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

/**
 * UMAP (Uniform Manifold Approximation and Projection) with WebGPU acceleration.
 *
 * Based on umap-js by Andy Coenen (Google LLC, Apache-2.0).
 * UMAP algorithm by Leland McInnes (BSD-3-Clause).
 *
 * This implementation adds WebGPU compute shader acceleration for:
 * - Pairwise distance computation
 * - KNN graph construction (brute-force GPU path)
 * - SGD attractive force gradients
 *
 * Falls back to CPU when WebGPU is not available.
 */

import { levenbergMarquardt } from 'ml-levenberg-marquardt';
import * as heap from './heap';
import * as matrix from './matrix';
import * as nnDescent from './nn_descent';
import * as tree from './tree';
import * as utils from './utils';
import { euclidean } from './distances';
import { getDevice, isWebGPUAvailable } from './gpu/webgpu_context';
import { computeKNNGPU, type KNNMetric } from './gpu/gpu_knn';
import { computeKNNNNDescent } from './gpu/gpu_nn_descent';
import { GPUSGDOptimizer, type GPUSGDConfig } from './gpu/sgd_optimization';
import { computeFuzzySimplicialSetGPU } from './gpu/gpu_fuzzy_simplicial_set';

import type {
  DistanceFn,
  RandomFn,
  EpochCallback,
  Vectors,
  UMAPParameters,
  UMAPSupervisedParams,
  TargetMetric,
} from './types';

import { OptimizationState } from './optimization_state';

const SMOOTH_K_TOLERANCE = 1e-5;
const MIN_K_DIST_SCALE = 1e-3;

/**
 * UMAP projection with optional WebGPU acceleration.
 */
export class UMAP {
  private learningRate = 1.0;
  private localConnectivity = 1.0;
  private minDist = 0.1;
  private nComponents = 2;
  private nEpochs = 0;
  private nNeighbors = 15;
  private negativeSampleRate = 5;
  private random: RandomFn = Math.random;
  private repulsionStrength = 1.0;
  private setOpMixRatio = 1.0;
  private spread = 1.0;
  private transformQueueSize = 4.0;

  // Supervised projection params
  private targetMetric: TargetMetric = 'categorical' as TargetMetric;
  private targetWeight = 0.5;
  private targetNNeighbors = this.nNeighbors;

  private distanceFn: DistanceFn = euclidean;

  // KNN state
  private knnIndices?: number[][];
  private knnDistances?: number[][];

  // Internal state
  private graph!: matrix.SparseMatrix;
  private X!: Vectors;
  private isInitialized = false;
  private rpForest: tree.FlatTree[] = [];
  private initFromRandom!: nnDescent.InitFromRandomFn;
  private initFromTree!: nnDescent.InitFromTreeFn;
  private search!: nnDescent.SearchFn;
  private searchGraph!: matrix.SparseMatrix;

  // Supervised labels
  private Y?: number[];

  // Projected embedding
  private embedding: number[][] = [];
  private optimizationState = new OptimizationState();

  // GPU acceleration
  private useGPU: boolean;
  private gpuMetric: KNNMetric = 'euclidean';
  private gpuOptimizer: GPUSGDOptimizer | null = null;

  constructor(params: UMAPParameters = {}) {
    // Determine GPU mode: default to auto-detect
    this.useGPU = isWebGPUAvailable();

    const setParam = (key: string) => {
      if ((params as Record<string, unknown>)[key] !== undefined) {
        (this as Record<string, unknown>)[key] = (params as Record<string, unknown>)[key];
      }
    };

    setParam('distanceFn');
    setParam('learningRate');
    setParam('localConnectivity');
    setParam('minDist');
    setParam('nComponents');
    setParam('nEpochs');
    setParam('nNeighbors');
    setParam('negativeSampleRate');
    setParam('random');
    setParam('repulsionStrength');
    setParam('setOpMixRatio');
    setParam('spread');
    setParam('transformQueueSize');
  }

  /**
   * Enable or disable GPU acceleration.
   * When set to false, CPU fallback is always used.
   */
  setUseGPU(value: boolean): void {
    this.useGPU = value && isWebGPUAvailable();
  }

  /**
   * Set the GPU distance metric (only used in GPU path).
   */
  setGPUMetric(metric: KNNMetric): void {
    this.gpuMetric = metric;
  }

  /**
   * Fit the data synchronously (CPU only).
   */
  fit(X: Vectors): number[][] {
    this.initializeFit(X);
    this.optimizeLayout();
    return this.embedding;
  }

  /**
   * Fit the data asynchronously with optional GPU acceleration.
   * When WebGPU is available, the SGD optimization runs entirely on the GPU.
   * The callback receives the current epoch and the embedding (read back from GPU).
   */
  async fitAsync(X: Vectors, callback: EpochCallback = () => true): Promise<number[][]> {
    await this.initializeFitAsync(X);

    if (this.useGPU && this.gpuOptimizer) {
      await this.optimizeLayoutGPU(callback);
    } else {
      await this.optimizeLayoutAsync(callback);
    }
    return this.embedding;
  }

  /** Set up supervised projection. */
  setSupervisedProjection(Y: number[], params: UMAPSupervisedParams = {}): void {
    this.Y = Y;
    this.targetMetric = params.targetMetric || this.targetMetric;
    this.targetWeight = params.targetWeight || this.targetWeight;
    this.targetNNeighbors = params.targetNNeighbors || this.targetNNeighbors;
  }

  /** Provide precomputed KNN indices and distances. */
  setPrecomputedKNN(knnIndices: number[][], knnDistances: number[][]): void {
    this.knnIndices = knnIndices;
    this.knnDistances = knnDistances;
  }

  /**
   * Initialize fit (CPU path). Returns the number of epochs.
   */
  initializeFit(X: Vectors): number {
    if (X.length <= this.nNeighbors) {
      throw new Error(`Not enough data points (${X.length}) for nNeighbors: ${this.nNeighbors}.`);
    }

    if (this.X === X && this.isInitialized) {
      return this.getNEpochs();
    }

    this.X = X;

    if (!this.knnIndices && !this.knnDistances) {
      const knnResults = this.nearestNeighbors(X);
      this.knnIndices = knnResults.knnIndices;
      this.knnDistances = knnResults.knnDistances;
    }

    this.graph = this.fuzzySimplicialSet(X, this.nNeighbors, this.setOpMixRatio);

    this.makeSearchFns();
    this.searchGraph = this.makeSearchGraph(X);
    this.processGraphForSupervisedProjection();

    const { head, tail, epochsPerSample } = this.initializeSimplicialSetEmbedding();

    this.optimizationState.head = head;
    this.optimizationState.tail = tail;
    this.optimizationState.epochsPerSample = epochsPerSample;

    this.initializeOptimization();
    this.prepareForOptimizationLoop();
    this.isInitialized = true;

    return this.getNEpochs();
  }

  /**
   * Initialize fit with GPU acceleration when available.
   */
  async initializeFitAsync(X: Vectors): Promise<number> {
    if (X.length <= this.nNeighbors) {
      throw new Error(`Not enough data points (${X.length}) for nNeighbors: ${this.nNeighbors}.`);
    }

    if (this.X === X && this.isInitialized) {
      return this.getNEpochs();
    }

    this.X = X;

    if (!this.knnIndices && !this.knnDistances) {
      if (this.useGPU) {
        try {
          await this.gpuNearestNeighbors(X);
        } catch {
          // Fall back to CPU
          const knnResults = this.nearestNeighbors(X);
          this.knnIndices = knnResults.knnIndices;
          this.knnDistances = knnResults.knnDistances;
        }
      } else {
        const knnResults = this.nearestNeighbors(X);
        this.knnIndices = knnResults.knnIndices;
        this.knnDistances = knnResults.knnDistances;
      }
    }

    // ── Build fuzzy simplicial set (graph) ──
    let gpuFuzzyOk = false;

    if (this.useGPU) {
      try {
        const device = await getDevice();
        if (device) {
          const coo = await computeFuzzySimplicialSetGPU(
            device,
            this.knnIndices!,
            this.knnDistances!,
            X.length,
            this.nNeighbors,
            this.localConnectivity,
            this.setOpMixRatio
          );

          // Construct SparseMatrix for API compatibility (transform, supervised)
          this.graph = new matrix.SparseMatrix(coo.rows, coo.cols, coo.vals, [X.length, X.length]);
          gpuFuzzyOk = true;
        }
      } catch {
        // Fall back to CPU fuzzy simplicial set
      }
    }

    if (!gpuFuzzyOk) {
      this.graph = this.fuzzySimplicialSet(X, this.nNeighbors, this.setOpMixRatio);
    }

    this.makeSearchFns();
    this.searchGraph = this.makeSearchGraph(X);
    this.processGraphForSupervisedProjection();

    const { head, tail, epochsPerSample } = this.initializeSimplicialSetEmbedding();

    this.optimizationState.head = head;
    this.optimizationState.tail = tail;
    this.optimizationState.epochsPerSample = epochsPerSample;

    this.initializeOptimization();
    this.prepareForOptimizationLoop();
    this.isInitialized = true;

    // Initialize GPU SGD optimizer if WebGPU is available
    if (this.useGPU) {
      try {
        await this.initGPUOptimizer();
      } catch {
        // Fall back to CPU SGD
        this.gpuOptimizer = null;
      }
    }

    return this.getNEpochs();
  }

  /**
   * Step through one epoch of optimization (CPU path).
   * Returns current epoch number.
   */
  step(): number {
    const { currentEpoch } = this.optimizationState;
    if (currentEpoch < this.getNEpochs()) {
      this.optimizeLayoutStep(currentEpoch);
    }
    return this.optimizationState.currentEpoch;
  }

  /**
   * Step through one epoch of optimization on the GPU.
   * Returns current epoch number. The embedding stays on the GPU —
   * use getEmbeddingAsync() to read it back when needed.
   */
  stepGPU(): number {
    if (!this.gpuOptimizer) {
      throw new Error(
        'GPU optimizer not initialized. Call initializeFitAsync() first with WebGPU available.'
      );
    }
    const { currentEpoch, nEpochs, initialAlpha } = this.optimizationState;
    if (currentEpoch < nEpochs) {
      const alpha = initialAlpha * (1.0 - currentEpoch / nEpochs);
      this.gpuOptimizer.step(currentEpoch, alpha);
      this.optimizationState.currentEpoch += 1;
    }
    return this.optimizationState.currentEpoch;
  }

  /**
   * Run multiple GPU epochs without readback. Very efficient for
   * batching work when you don't need intermediate visualizations.
   * Returns current epoch number.
   */
  stepGPUBatch(count: number): number {
    if (!this.gpuOptimizer) {
      throw new Error('GPU optimizer not initialized.');
    }
    const { currentEpoch, nEpochs, initialAlpha } = this.optimizationState;
    const ran = this.gpuOptimizer.runEpochs(currentEpoch, count, initialAlpha, nEpochs);
    this.optimizationState.currentEpoch = Math.min(ran, nEpochs);
    return this.optimizationState.currentEpoch;
  }

  /** Get the current embedding (CPU, synchronous). */
  getEmbedding(): number[][] {
    return this.embedding;
  }

  /**
   * Read the embedding back from GPU and update the CPU-side copy.
   * Only needed when using GPU optimization and you want to inspect the result.
   */
  async getEmbeddingAsync(): Promise<number[][]> {
    if (this.gpuOptimizer) {
      const flat = await this.gpuOptimizer.readback();
      const { dim } = this.optimizationState;
      const nPoints = flat.length / dim;
      for (let i = 0; i < nPoints; i++) {
        if (!this.embedding[i]) this.embedding[i] = new Array(dim);
        for (let d = 0; d < dim; d++) {
          this.embedding[i][d] = flat[i * dim + d];
        }
      }
    }
    return this.embedding;
  }

  /**
   * Check if the GPU optimization path is active.
   */
  isGPUOptimizing(): boolean {
    return this.gpuOptimizer !== null;
  }

  /**
   * Release GPU resources. Call when done with the UMAP instance.
   */
  destroyGPU(): void {
    if (this.gpuOptimizer) {
      this.gpuOptimizer.destroy();
      this.gpuOptimizer = null;
    }
  }

  /** Transform new data using the trained model. */
  transform(toTransform: Vectors): number[][] {
    const rawData = this.X;
    if (rawData === undefined || rawData.length === 0) {
      throw new Error('No data has been fit.');
    }

    let nNeighbors = Math.floor(this.nNeighbors * this.transformQueueSize);
    nNeighbors = Math.min(rawData.length, nNeighbors);
    const init = nnDescent.initializeSearch(
      this.rpForest,
      rawData,
      toTransform,
      nNeighbors,
      this.initFromRandom,
      this.initFromTree,
      this.random
    );

    const result = this.search(rawData, this.searchGraph, init, toTransform);
    let { indices, weights: distances } = heap.deheapSort(result);

    indices = indices.map((x) => x.slice(0, this.nNeighbors));
    distances = distances.map((x) => x.slice(0, this.nNeighbors));

    const adjustedLocalConnectivity = Math.max(0, this.localConnectivity - 1);
    const { sigmas, rhos } = this.smoothKNNDistance(
      distances,
      this.nNeighbors,
      adjustedLocalConnectivity
    );

    const { rows, cols, vals } = this.computeMembershipStrengths(indices, distances, sigmas, rhos);

    const size = [toTransform.length, rawData.length];
    let graph = new matrix.SparseMatrix(rows, cols, vals, size);

    const normed = matrix.normalize(graph, matrix.NormType.l1);
    const csrMatrix = matrix.getCSR(normed);
    const nPoints = toTransform.length;

    const eIndices = utils.reshape2d(csrMatrix.indices, nPoints, this.nNeighbors);
    const eWeights = utils.reshape2d(csrMatrix.values, nPoints, this.nNeighbors);

    const embeddingResult = initTransform(eIndices, eWeights, this.embedding);

    const nEpochs = this.nEpochs ? this.nEpochs / 3 : graph.nRows <= 10000 ? 100 : 30;

    const graphMax = graph.getValues().reduce((max, val) => (val > max ? val : max), 0);
    graph = graph.map((value) => (value < graphMax / nEpochs ? 0 : value));
    graph = matrix.eliminateZeros(graph);

    const epochsPerSample = this.makeEpochsPerSample(graph.getValues(), nEpochs);
    const headArr = graph.getRows();
    const tailArr = graph.getCols();

    this.assignOptimizationStateParameters({
      headEmbedding: embeddingResult,
      tailEmbedding: this.embedding,
      head: headArr,
      tail: tailArr,
      currentEpoch: 0,
      nEpochs,
      nVertices: graph.getDims()[1],
      epochsPerSample,
    });
    this.prepareForOptimizationLoop();

    return this.optimizeLayout();
  }

  // ─── Private: GPU-accelerated KNN ─────────────────────────────

  /**
   * GPU KNN with smart routing:
   * - N ≤ 4096: brute-force (tiled to prevent TDR)
   * - N > 4096: NN-Descent (approximate, O(N·K²) per iteration)
   */
  private async gpuNearestNeighbors(X: Vectors): Promise<void> {
    const device = await getDevice();
    if (!device) {
      throw new Error('WebGPU device not available');
    }

    const n = X.length;
    const dims = X[0].length;

    // Flatten data to a contiguous Float32Array
    const flatData = new Float32Array(n * dims);
    for (let i = 0; i < n; i++) {
      for (let d = 0; d < dims; d++) {
        flatData[i * dims + d] = X[i][d];
      }
    }

    // Route: brute-force for small datasets, nn-descent for large
    const USE_NN_DESCENT_THRESHOLD = 4096;

    let knnIndices: number[][];
    let knnDistances: number[][];

    if (n <= USE_NN_DESCENT_THRESHOLD) {
      // Brute-force with tiling (safe from TDR)
      const result = await computeKNNGPU(
        device,
        flatData,
        n,
        dims,
        this.nNeighbors,
        this.gpuMetric
      );
      knnIndices = result.knnIndices;
      knnDistances = result.knnDistances;
    } else {
      // NN-Descent: approximate but scales to 100K+
      const result = await computeKNNNNDescent(device, flatData, n, dims, this.nNeighbors);
      knnIndices = result.knnIndices;
      knnDistances = result.knnDistances;
    }

    this.knnIndices = knnIndices;
    this.knnDistances = knnDistances;
  }

  // ─── Private: GPU SGD optimizer init ──────────────────────────

  private async initGPUOptimizer(): Promise<void> {
    const device = await getDevice();
    if (!device) throw new Error('WebGPU device not available');

    const state = this.optimizationState;
    const nEdges = state.head.length;
    const dim = state.dim;
    const nPoints = state.headEmbedding.length;

    // Flatten embedding to Float32Array
    const flatEmbedding = new Float32Array(nPoints * dim);
    for (let i = 0; i < nPoints; i++) {
      for (let d = 0; d < dim; d++) {
        flatEmbedding[i * dim + d] = state.headEmbedding[i][d];
      }
    }

    const config: GPUSGDConfig = {
      embedding: flatEmbedding,
      head: new Uint32Array(state.head),
      tail: new Uint32Array(state.tail),
      epochsPerSample: new Float32Array(state.epochsPerSample),
      epochOfNextSample: new Float32Array(state.epochOfNextSample),
      epochsPerNegSample: new Float32Array(state.epochsPerNegativeSample),
      epochOfNextNegSample: new Float32Array(state.epochOfNextNegativeSample),
      nEdges,
      nPoints,
      dim,
      nVertices: state.nVertices,
      a: state.a,
      b: state.b,
      gamma: state.gamma,
      initialAlpha: state.initialAlpha,
      nEpochs: state.nEpochs,
      moveOther: state.moveOther,
      negativeSampleRate: this.negativeSampleRate,
    };

    this.gpuOptimizer = new GPUSGDOptimizer(device, config);
  }

  /**
   * Run the full SGD optimization on the GPU with periodic readback for callbacks.
   */
  private async optimizeLayoutGPU(epochCallback: EpochCallback = () => true): Promise<void> {
    if (!this.gpuOptimizer) {
      throw new Error('GPU optimizer not initialized');
    }

    const { nEpochs, initialAlpha } = this.optimizationState;

    // Run epochs in batches, yielding to the event loop + calling back periodically
    const BATCH_SIZE = 10; // Epochs per GPU batch before yielding

    while (this.optimizationState.currentEpoch < nEpochs) {
      const remaining = nEpochs - this.optimizationState.currentEpoch;
      const batch = Math.min(BATCH_SIZE, remaining);

      this.gpuOptimizer.runEpochs(
        this.optimizationState.currentEpoch,
        batch,
        initialAlpha,
        nEpochs
      );
      this.optimizationState.currentEpoch += batch;

      // Read back embedding for the callback
      await this.getEmbeddingAsync();

      const shouldStop = epochCallback(this.optimizationState.currentEpoch) === false;
      if (shouldStop) break;

      // Yield to event loop so UI can update
      await new Promise<void>((resolve) => setTimeout(resolve, 0));
    }

    // Final readback
    await this.getEmbeddingAsync();
    this.destroyGPU();
  }

  // ─── Private: CPU nearest neighbors ───────────────────────────

  private nearestNeighbors(X: Vectors) {
    const { distanceFn, nNeighbors } = this;
    const log2 = (n: number) => Math.log(n) / Math.log(2);
    const metricNNDescent = nnDescent.makeNNDescent(distanceFn, this.random);

    const round = (n: number) => (n === 0.5 ? 0 : Math.round(n));
    const nTrees = 5 + Math.floor(round(X.length ** 0.5 / 20.0));
    const nIters = Math.max(5, Math.floor(Math.round(log2(X.length))));

    this.rpForest = tree.makeForest(X, nNeighbors, nTrees, this.random);
    const leafArray = tree.makeLeafArray(this.rpForest);
    const { indices, weights } = metricNNDescent(X, leafArray, nNeighbors, nIters);
    return { knnIndices: indices, knnDistances: weights };
  }

  // ─── Private: Search functions ────────────────────────────────

  private makeSearchFns(): void {
    const { initFromTree, initFromRandom } = nnDescent.makeInitializations(this.distanceFn);
    this.initFromTree = initFromTree;
    this.initFromRandom = initFromRandom;
    this.search = nnDescent.makeInitializedNNSearch(this.distanceFn);
  }

  private makeSearchGraph(X: Vectors): matrix.SparseMatrix {
    const knnIndices = this.knnIndices!;
    const knnDistances = this.knnDistances!;
    const dims = [X.length, X.length];
    const searchGraph = new matrix.SparseMatrix([], [], [], dims);
    for (let i = 0; i < knnIndices.length; i++) {
      const knn = knnIndices[i];
      const distances = knnDistances[i];
      for (let j = 0; j < knn.length; j++) {
        const neighbor = knn[j];
        const distance = distances[j];
        if (distance > 0) {
          searchGraph.set(i, neighbor, distance);
        }
      }
    }
    const transpose = matrix.transpose(searchGraph);
    return matrix.maximum(searchGraph, transpose);
  }

  // ─── Private: Fuzzy simplicial set ────────────────────────────

  private fuzzySimplicialSet(
    X: Vectors,
    nNeighbors: number,
    setOpMixRatio = 1.0
  ): matrix.SparseMatrix {
    const { knnIndices = [], knnDistances = [], localConnectivity } = this;

    const { sigmas, rhos } = this.smoothKNNDistance(knnDistances, nNeighbors, localConnectivity);

    const { rows, cols, vals } = this.computeMembershipStrengths(
      knnIndices,
      knnDistances,
      sigmas,
      rhos
    );

    const size = [X.length, X.length];
    const sparseMatrix = new matrix.SparseMatrix(rows, cols, vals, size);
    const transpose = matrix.transpose(sparseMatrix);
    const prodMatrix = matrix.pairwiseMultiply(sparseMatrix, transpose);

    const a = matrix.subtract(matrix.add(sparseMatrix, transpose), prodMatrix);
    const b = matrix.multiplyScalar(a, setOpMixRatio);
    const c = matrix.multiplyScalar(prodMatrix, 1.0 - setOpMixRatio);
    return matrix.add(b, c);
  }

  private smoothKNNDistance(
    distances: number[][],
    k: number,
    localConnectivity = 1.0,
    nIter = 64,
    bandwidth = 1.0
  ) {
    const target = (Math.log(k) / Math.log(2)) * bandwidth;
    const rho = utils.zeros(distances.length);
    const result = utils.zeros(distances.length);

    for (let i = 0; i < distances.length; i++) {
      let lo = 0.0;
      let hi = Infinity;
      let mid = 1.0;

      const ithDistances = distances[i];
      const nonZeroDists = ithDistances.filter((d) => d > 0.0);

      if (nonZeroDists.length >= localConnectivity) {
        const index = Math.floor(localConnectivity);
        const interpolation = localConnectivity - index;
        if (index > 0) {
          rho[i] = nonZeroDists[index - 1];
          if (interpolation > SMOOTH_K_TOLERANCE) {
            rho[i] += interpolation * (nonZeroDists[index] - nonZeroDists[index - 1]);
          }
        } else {
          rho[i] = interpolation * nonZeroDists[0];
        }
      } else if (nonZeroDists.length > 0) {
        rho[i] = utils.max(nonZeroDists);
      }

      for (let n = 0; n < nIter; n++) {
        let psum = 0.0;
        for (let j = 1; j < distances[i].length; j++) {
          const d = distances[i][j] - rho[i];
          psum += d > 0 ? Math.exp(-(d / mid)) : 1.0;
        }

        if (Math.abs(psum - target) < SMOOTH_K_TOLERANCE) break;

        if (psum > target) {
          hi = mid;
          mid = (lo + hi) / 2.0;
        } else {
          lo = mid;
          mid = hi === Infinity ? mid * 2 : (lo + hi) / 2.0;
        }
      }

      result[i] = mid;

      if (rho[i] > 0.0) {
        const meanIthDistances = utils.mean(ithDistances);
        if (result[i] < MIN_K_DIST_SCALE * meanIthDistances) {
          result[i] = MIN_K_DIST_SCALE * meanIthDistances;
        }
      } else {
        const meanDistances = utils.mean(distances.map(utils.mean));
        if (result[i] < MIN_K_DIST_SCALE * meanDistances) {
          result[i] = MIN_K_DIST_SCALE * meanDistances;
        }
      }
    }

    return { sigmas: result, rhos: rho };
  }

  private computeMembershipStrengths(
    knnIndices: number[][],
    knnDistances: number[][],
    sigmas: number[],
    rhos: number[]
  ): { rows: number[]; cols: number[]; vals: number[] } {
    const nSamples = knnIndices.length;
    const nNeighbors = knnIndices[0].length;

    const rows = utils.zeros(nSamples * nNeighbors);
    const cols = utils.zeros(nSamples * nNeighbors);
    const vals = utils.zeros(nSamples * nNeighbors);

    for (let i = 0; i < nSamples; i++) {
      for (let j = 0; j < nNeighbors; j++) {
        let val = 0;
        if (knnIndices[i][j] === -1) continue;
        if (knnIndices[i][j] === i) {
          val = 0.0;
        } else if (knnDistances[i][j] - rhos[i] <= 0.0) {
          val = 1.0;
        } else {
          val = Math.exp(-((knnDistances[i][j] - rhos[i]) / sigmas[i]));
        }
        rows[i * nNeighbors + j] = i;
        cols[i * nNeighbors + j] = knnIndices[i][j];
        vals[i * nNeighbors + j] = val;
      }
    }

    return { rows, cols, vals };
  }

  // ─── Private: Supervised projection ───────────────────────────

  private processGraphForSupervisedProjection(): void {
    const { Y, X } = this;
    if (Y) {
      if (Y.length !== X.length) {
        throw new Error('Length of X and y must be equal');
      }
      if (this.targetMetric === ('categorical' as TargetMetric)) {
        const lt = this.targetWeight < 1.0;
        const farDist = lt ? 2.5 * (1.0 / (1.0 - this.targetWeight)) : 1.0e12;
        this.graph = this.categoricalSimplicialSetIntersection(this.graph, Y, farDist);
      }
    }
  }

  private categoricalSimplicialSetIntersection(
    simplicialSet: matrix.SparseMatrix,
    target: number[],
    farDist: number,
    unknownDist = 1.0
  ): matrix.SparseMatrix {
    let intersection = fastIntersection(simplicialSet, target, unknownDist, farDist);
    intersection = matrix.eliminateZeros(intersection);
    return resetLocalConnectivity(intersection);
  }

  // ─── Private: Embedding initialization ────────────────────────

  private initializeSimplicialSetEmbedding() {
    const nEpochs = this.getNEpochs();
    const { nComponents } = this;
    const graphValues = this.graph.getValues();
    let graphMax = 0;
    for (let i = 0; i < graphValues.length; i++) {
      if (graphMax < graphValues[i]) graphMax = graphValues[i];
    }

    const graph = this.graph.map((value) => (value < graphMax / nEpochs ? 0 : value));

    // Random initialization (no spectral)
    this.embedding = utils
      .zeros(graph.nRows)
      .map(() => utils.zeros(nComponents).map(() => utils.tauRand(this.random) * 20 + -10));

    const weights: number[] = [];
    const headArr: number[] = [];
    const tailArr: number[] = [];
    const rowColValues = graph.getAll();
    for (let i = 0; i < rowColValues.length; i++) {
      const entry = rowColValues[i];
      if (entry.value) {
        weights.push(entry.value);
        tailArr.push(entry.row);
        headArr.push(entry.col);
      }
    }
    const epochsPerSample = this.makeEpochsPerSample(weights, nEpochs);

    return { head: headArr, tail: tailArr, epochsPerSample };
  }

  private makeEpochsPerSample(weights: number[], nEpochs: number): number[] {
    const result = utils.filled(weights.length, -1.0);
    const maxW = utils.max(weights);
    const nSamples = weights.map((w) => (w / maxW) * nEpochs);
    nSamples.forEach((n, i) => {
      if (n > 0) result[i] = nEpochs / nSamples[i];
    });
    return result;
  }

  // ─── Private: Optimization ────────────────────────────────────

  private assignOptimizationStateParameters(state: Partial<OptimizationState>): void {
    Object.assign(this.optimizationState, state);
  }

  private prepareForOptimizationLoop(): void {
    const { repulsionStrength, learningRate, negativeSampleRate } = this;
    const { epochsPerSample, headEmbedding, tailEmbedding } = this.optimizationState;

    const dim = headEmbedding[0].length;
    const moveOther = headEmbedding.length === tailEmbedding.length;

    const epochsPerNegativeSample = epochsPerSample.map((e) => e / negativeSampleRate);
    const epochOfNextNegativeSample = [...epochsPerNegativeSample];
    const epochOfNextSample = [...epochsPerSample];

    this.assignOptimizationStateParameters({
      epochOfNextSample,
      epochOfNextNegativeSample,
      epochsPerNegativeSample,
      moveOther,
      initialAlpha: learningRate,
      alpha: learningRate,
      gamma: repulsionStrength,
      dim,
    });
  }

  private initializeOptimization(): void {
    const headEmbedding = this.embedding;
    const tailEmbedding = this.embedding;
    const { head, tail, epochsPerSample } = this.optimizationState;
    const nEpochs = this.getNEpochs();
    const nVertices = this.graph.nCols;
    const { a, b } = findABParams(this.spread, this.minDist);

    this.assignOptimizationStateParameters({
      headEmbedding,
      tailEmbedding,
      head,
      tail,
      epochsPerSample,
      a,
      b,
      nEpochs,
      nVertices,
    });
  }

  private optimizeLayoutStep(n: number): number[][] {
    const { optimizationState } = this;
    const {
      head,
      tail,
      headEmbedding,
      tailEmbedding,
      epochsPerSample,
      epochOfNextSample,
      epochOfNextNegativeSample,
      epochsPerNegativeSample,
      moveOther,
      initialAlpha,
      alpha,
      gamma,
      a,
      b,
      dim,
      nEpochs,
      nVertices,
    } = optimizationState;

    const clipValue = 4.0;

    for (let i = 0; i < epochsPerSample.length; i++) {
      if (epochOfNextSample[i] > n) continue;

      const j = head[i];
      const k = tail[i];
      const current = headEmbedding[j];
      const other = tailEmbedding[k];
      const distSquared = rDist(current, other);

      let gradCoeff = 0;
      if (distSquared > 0) {
        gradCoeff = -2.0 * a * b * Math.pow(distSquared, b - 1.0);
        gradCoeff /= a * Math.pow(distSquared, b) + 1.0;
      }

      for (let d = 0; d < dim; d++) {
        const gradD = clip(gradCoeff * (current[d] - other[d]), clipValue);
        current[d] += gradD * alpha;
        if (moveOther) other[d] += -gradD * alpha;
      }

      epochOfNextSample[i] += epochsPerSample[i];

      const nNegSamples = Math.floor(
        (n - epochOfNextNegativeSample[i]) / epochsPerNegativeSample[i]
      );

      for (let p = 0; p < nNegSamples; p++) {
        const kNeg = utils.tauRandInt(nVertices, this.random);
        const otherNeg = tailEmbedding[kNeg];
        const distSquaredNeg = rDist(current, otherNeg);

        let gradCoeffNeg = 0.0;
        if (distSquaredNeg > 0.0) {
          gradCoeffNeg = 2.0 * gamma * b;
          gradCoeffNeg /= (0.001 + distSquaredNeg) * (a * Math.pow(distSquaredNeg, b) + 1);
        } else if (j === kNeg) {
          continue;
        }

        for (let d = 0; d < dim; d++) {
          let gradD = 4.0;
          if (gradCoeffNeg > 0.0) {
            gradD = clip(gradCoeffNeg * (current[d] - otherNeg[d]), clipValue);
          }
          current[d] += gradD * alpha;
        }
      }
      epochOfNextNegativeSample[i] += nNegSamples * epochsPerNegativeSample[i];
    }

    optimizationState.alpha = initialAlpha * (1.0 - n / nEpochs);
    optimizationState.currentEpoch += 1;
    return headEmbedding;
  }

  private optimizeLayoutAsync(epochCallback: EpochCallback = () => true): Promise<boolean> {
    return new Promise((resolve, reject) => {
      const step = async () => {
        try {
          const { nEpochs, currentEpoch } = this.optimizationState;
          this.embedding = this.optimizeLayoutStep(currentEpoch);
          const epochCompleted = this.optimizationState.currentEpoch;
          const shouldStop = epochCallback(epochCompleted) === false;
          const isFinished = epochCompleted === nEpochs;
          if (!shouldStop && !isFinished) {
            setTimeout(() => step(), 0);
          } else {
            return resolve(isFinished);
          }
        } catch (err) {
          reject(err);
        }
      };
      setTimeout(() => step(), 0);
    });
  }

  private optimizeLayout(epochCallback: EpochCallback = () => true): number[][] {
    let isFinished = false;
    let embedding: number[][] = [];
    while (!isFinished) {
      const { nEpochs, currentEpoch } = this.optimizationState;
      embedding = this.optimizeLayoutStep(currentEpoch);
      const epochCompleted = this.optimizationState.currentEpoch;
      const shouldStop = epochCallback(epochCompleted) === false;
      isFinished = epochCompleted === nEpochs || shouldStop;
    }
    return embedding;
  }

  private getNEpochs(): number {
    if (this.nEpochs > 0) return this.nEpochs;
    const length = this.graph.nRows;
    if (length <= 2500) return 500;
    if (length <= 5000) return 400;
    if (length <= 7500) return 300;
    return 200;
  }
}

// ─── Helper functions ───────────────────────────────────────────

function clip(x: number, clipValue: number): number {
  if (x > clipValue) return clipValue;
  if (x < -clipValue) return -clipValue;
  return x;
}

function rDist(x: number[], y: number[]): number {
  let result = 0.0;
  for (let i = 0; i < x.length; i++) {
    result += Math.pow(x[i] - y[i], 2);
  }
  return result;
}

/**
 * Find a, b params for the differentiable curve used in embedding.
 */
export function findABParams(spread: number, minDist: number): { a: number; b: number } {
  const curve =
    ([a, b]: number[]) =>
    (x: number) =>
      1.0 / (1.0 + a * x ** (2 * b));

  const xv = utils.linear(0, spread * 3, 300).map((val) => (val < minDist ? 1.0 : val));

  const yv = utils.zeros(xv.length).map((val, index) => {
    const gte = xv[index] >= minDist;
    return gte ? Math.exp(-(xv[index] - minDist) / spread) : val;
  });

  const initialValues = [0.5, 0.5];
  const data = { x: xv, y: yv };

  const options = {
    damping: 1.5,
    initialValues,
    gradientDifference: 10e-2,
    maxIterations: 100,
    errorTolerance: 10e-3,
  };

  const { parameterValues } = levenbergMarquardt(data, curve, options);
  const [a, b] = parameterValues as number[];
  return { a, b };
}

/**
 * Fast intersection for categorical supervised projection.
 */
export function fastIntersection(
  graph: matrix.SparseMatrix,
  target: number[],
  unknownDist = 1.0,
  farDist = 5.0
): matrix.SparseMatrix {
  return graph.map((value, row, col) => {
    if (target[row] === -1 || target[col] === -1) {
      return value * Math.exp(-unknownDist);
    } else if (target[row] !== target[col]) {
      return value * Math.exp(-farDist);
    }
    return value;
  });
}

/**
 * Reset local connectivity in a simplicial set.
 */
export function resetLocalConnectivity(simplicialSet: matrix.SparseMatrix): matrix.SparseMatrix {
  simplicialSet = matrix.normalize(simplicialSet, matrix.NormType.max);
  const transpose = matrix.transpose(simplicialSet);
  const prodMatrix = matrix.pairwiseMultiply(transpose, simplicialSet);
  simplicialSet = matrix.add(simplicialSet, matrix.subtract(transpose, prodMatrix));
  return matrix.eliminateZeros(simplicialSet);
}

/**
 * Initialize transform embedding positions.
 */
export function initTransform(
  indices: number[][],
  weights: number[][],
  embedding: number[][]
): number[][] {
  const result = utils.zeros(indices.length).map(() => utils.zeros(embedding[0].length));

  for (let i = 0; i < indices.length; i++) {
    for (let j = 0; j < indices[0].length; j++) {
      for (let d = 0; d < embedding[0].length; d++) {
        const a = indices[i][j];
        result[i][d] += weights[i][j] * embedding[a][d];
      }
    }
  }
  return result;
}
