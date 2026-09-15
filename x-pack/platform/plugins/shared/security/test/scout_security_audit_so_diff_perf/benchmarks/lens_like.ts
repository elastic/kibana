/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildLensLike, makeBenchmark } from './scenarios';

// 50 layers (~560 leaves) plus a 200kb string attribute clamped by fieldSizeLimit (48kb)
export const config = makeBenchmark(() => ({
  iterations: 50,
  a: buildLensLike(50, 200),
  b: buildLensLike(50, 200, '-v2'),
  fieldSizeLimit: 48 * 1024,
}));
