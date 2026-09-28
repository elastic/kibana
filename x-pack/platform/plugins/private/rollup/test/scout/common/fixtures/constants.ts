/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// From 8.15 ES only unhides the rollup UI and allows creating jobs when the cluster already has
// rollup usage; this mock index (with a `_meta._rollup` mapping) simulates it.
export const MOCK_ROLLUP_INDEX_NAME = 'mock-rollup-index';

// Rollup target index the mock usage declares, and the default target for the jobs under test.
export const ROLLUP_INDEX_NAME = 'rollup_index';
