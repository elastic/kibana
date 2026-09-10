/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildNested, makeBenchmark } from './scenarios';

// worst case for ops: every panel title changes (2000 replace ops with value + oldValue)
export const config = makeBenchmark(() => ({
  iterations: 20,
  a: buildNested(2000),
  b: buildNested(2000, '-v2'),
}));
