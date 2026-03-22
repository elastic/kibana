/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Main entry point
export { batchProcess } from './orchestrator';

// Low-level utilities
export { tokenBasedSplit, itemBasedSplit } from './split';
export { hierarchicalMerge } from './merge';

// Types
export type { BatchConfig, BatchResult, BatchStats, SplitStrategy, MergeStrategy } from './types';
