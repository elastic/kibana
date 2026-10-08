/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildNested, makeBenchmark } from './scenarios';

// 2000 panels ≈ 10k leaves; the update touches one leaf
export const config = makeBenchmark(() => ({
  iterations: 20,
  a: buildNested(2000),
  b: { ...buildNested(2000), title: 'renamed' },
}));
