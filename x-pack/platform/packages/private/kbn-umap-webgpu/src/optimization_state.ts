/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Optimization state tracked between SGD steps.
 *
 * Ported from umap-js.
 * Original: Copyright 2019 Google LLC (Apache-2.0)
 * UMAP algorithm: Copyright 2017 Leland McInnes (BSD-3-Clause)
 */
export class OptimizationState {
  currentEpoch = 0;
  headEmbedding: number[][] = [];
  tailEmbedding: number[][] = [];
  head: number[] = [];
  tail: number[] = [];
  epochsPerSample: number[] = [];
  epochOfNextSample: number[] = [];
  epochOfNextNegativeSample: number[] = [];
  epochsPerNegativeSample: number[] = [];
  moveOther = true;
  initialAlpha = 1.0;
  alpha = 1.0;
  gamma = 1.0;
  a = 1.5769434603113077;
  b = 0.8950608779109733;
  dim = 2;
  nEpochs = 500;
  nVertices = 0;
}
