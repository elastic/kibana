/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export {
  registerMemoryConsolidationTaskDefinition,
  scheduleMemoryConsolidationTask,
  runConsolidation,
  MEMORY_CONSOLIDATION_TASK_TYPE,
  MEMORY_CONSOLIDATION_TASK_ID,
} from './consolidation_task';
export type { ConsolidationDepsProvider, ConsolidationResult, ConsolidationStepStats } from './consolidation_task';

export { DuplicateMerger } from './duplicate_merger';
export type { DuplicatePair, MergeResult } from './duplicate_merger';

export { ContradictionResolver } from './contradiction_resolver';
export type { ContradictionResolution, ContradictionResolverResult } from './contradiction_resolver';

export { PruningService, computeStability } from './pruning_service';
export type { PruningStats } from './pruning_service';
