/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildNested, makeBenchmark } from './scenarios';

// 20000 panels ≈ 100k leaves; the update touches one leaf
export const config = makeBenchmark(() => ({
  iterations: 5,
  a: buildNested(20000),
  b: { ...buildNested(20000), title: 'renamed' },
}));
