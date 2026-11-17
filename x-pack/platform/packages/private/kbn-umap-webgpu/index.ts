/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * umap-webgpu — WebGPU-accelerated UMAP dimensionality reduction.
 *
 * @packageDocumentation
 */

export {
  UMAP,
  findABParams,
  fastIntersection,
  resetLocalConnectivity,
  initTransform,
} from './src/umap';
export { euclidean, cosine } from './src/distances';
export { isWebGPUAvailable, getDevice, releaseDevice } from './src/gpu/webgpu_context';

export type {
  Vector,
  Vectors,
  DistanceFn,
  RandomFn,
  EpochCallback,
  UMAPParameters,
  UMAPSupervisedParams,
  TargetMetric,
} from './src/types';

export type { KNNMetric } from './src/gpu/gpu_knn';
export { computeKNNNNDescent } from './src/gpu/gpu_nn_descent';
export type { NNDescentProgress } from './src/gpu/gpu_nn_descent';
export { GPUSGDOptimizer } from './src/gpu/sgd_optimization';
export type { GPUSGDConfig } from './src/gpu/sgd_optimization';
export { computeFuzzySimplicialSetGPU } from './src/gpu/gpu_fuzzy_simplicial_set';
export type { FuzzySimplicialSetResult } from './src/gpu/gpu_fuzzy_simplicial_set';
export { dbscanGPU } from './src/gpu/gpu_dbscan';
export type { DBSCANResult } from './src/gpu/gpu_dbscan';
export { WebGPURenderer } from './src/gpu/webgpu_renderer';
export type { WebGPURendererOptions } from './src/gpu/webgpu_renderer';

// ── Clustering utilities ─────────────────────────────────────────
export { autoCluster, reassignNoise, computeClusterNames } from './src/clustering';
export type { ClusterNameOptions, ClusterNameResult } from './src/clustering';

// ── Defaults ─────────────────────────────────────────────────────
export { DEFAULT_COLORS, NOISE_COLOR, buildColorPalette } from './src/defaults';
