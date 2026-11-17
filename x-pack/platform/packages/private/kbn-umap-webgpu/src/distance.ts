/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * CPU distance functions.
 *
 * These serve as the default distance implementations and as fallback
 * when WebGPU is not available.
 *
 * Ported from umap-js.
 * Original: Copyright 2019 Google LLC (Apache-2.0)
 * UMAP algorithm: Copyright 2017 Leland McInnes (BSD-3-Clause)
 */

import type { Vector } from './types';

/** Euclidean distance between two vectors. */
export function euclidean(x: Vector, y: Vector): number {
  let result = 0;
  for (let i = 0; i < x.length; i++) {
    result += (x[i] - y[i]) ** 2;
  }
  return Math.sqrt(result);
}

/** Cosine distance between two vectors (1 - cosine similarity). */
export function cosine(x: Vector, y: Vector): number {
  let dotProduct = 0.0;
  let normX = 0.0;
  let normY = 0.0;

  for (let i = 0; i < x.length; i++) {
    dotProduct += x[i] * y[i];
    normX += x[i] ** 2;
    normY += y[i] ** 2;
  }

  if (normX === 0 && normY === 0) return 0;
  if (normX === 0 || normY === 0) return 1.0;
  return 1.0 - dotProduct / Math.sqrt(normX * normY);
}
