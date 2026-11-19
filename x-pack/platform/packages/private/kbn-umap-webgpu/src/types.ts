/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Core types for umap-webgpu.
 *
 * Based on the UMAP algorithm by Leland McInnes.
 * Reference: https://github.com/lmcinnes/umap
 */

/** A single data point (1-D array of numbers). */
export type Vector = number[];

/** A collection of data points. */
export type Vectors = Vector[];

/** Distance function signature. */
export type DistanceFn = (x: Vector, y: Vector) => number;

/** Pseudo-random number generator function. */
export type RandomFn = () => number;

/** Callback invoked after each SGD epoch; return false to stop early. */
export type EpochCallback = (epoch: number) => boolean | void;

/** Target metric for supervised projection. */
export enum TargetMetric {
  categorical = 'categorical',
  l1 = 'l1',
  l2 = 'l2',
}

/** Parameters for configuring the UMAP algorithm. */
export interface UMAPParameters {
  /**
   * Distance function for assessing nearest neighbors.
   * Defaults to euclidean distance.
   */
  distanceFn?: DistanceFn;

  /** Initial learning rate for embedding optimization. Default: 1.0 */
  learningRate?: number;

  /**
   * Local connectivity — the number of nearest neighbors assumed to be
   * connected at a local level. Default: 1.0
   */
  localConnectivity?: number;

  /**
   * Effective minimum distance between embedded points.
   * Smaller → more clustered. Default: 0.1
   */
  minDist?: number;

  /** Dimension of the embedding space. Default: 2 */
  nComponents?: number;

  /**
   * Number of training epochs. If 0, a value is selected based on data size.
   * Default: 0 (auto)
   */
  nEpochs?: number;

  /**
   * Number of nearest neighbors for manifold approximation.
   * Larger → more global view. Default: 15
   */
  nNeighbors?: number;

  /** Negative samples per positive sample. Default: 5 */
  negativeSampleRate?: number;

  /** Repulsive force strength. Default: 1.0 */
  repulsionStrength?: number;

  /** Pseudo-random number generator. Default: Math.random */
  random?: RandomFn;

  /**
   * Interpolation between fuzzy union (1.0) and intersection (0.0).
   * Default: 1.0
   */
  setOpMixRatio?: number;

  /** Effective scale of embedded points. Default: 1.0 */
  spread?: number;

  /** Controls search aggressiveness for transform operations. Default: 4.0 */
  transformQueueSize?: number;
}

/** Parameters for supervised UMAP projection. */
export interface UMAPSupervisedParams {
  /** Metric for target distance. Default: 'categorical' */
  targetMetric?: TargetMetric;

  /**
   * Weight between data topology (0.0) and target topology (1.0).
   * Default: 0.5
   */
  targetWeight?: number;

  /** Number of nearest neighbors for target simplicial set. */
  targetNNeighbors?: number;
}

/**
 * Internal state tracked between SGD optimization steps.
 */
export interface OptimizationStateValues {
  currentEpoch: number;
  headEmbedding: number[][];
  tailEmbedding: number[][];
  head: number[];
  tail: number[];
  epochsPerSample: number[];
  epochOfNextSample: number[];
  epochOfNextNegativeSample: number[];
  epochsPerNegativeSample: number[];
  moveOther: boolean;
  initialAlpha: number;
  alpha: number;
  gamma: number;
  a: number;
  b: number;
  dim: number;
  nEpochs: number;
  nVertices: number;
}
