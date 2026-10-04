/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildArrayOfObjects, makeBenchmark } from './scenarios';

// 2000-element array of objects re-serialized with reordered keys: structural equality path
export const config = makeBenchmark(() => ({
  iterations: 20,
  a: buildArrayOfObjects(2000, false),
  b: buildArrayOfObjects(2000, true),
}));
