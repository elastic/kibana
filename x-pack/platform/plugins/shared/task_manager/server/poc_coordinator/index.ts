/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/*
 * PoC: coordination/execution seam. Coordination-only module — the dependency
 * gate (dep_check.js) loads this entry point and asserts that nothing from
 * task_pool, task_running or CoreStart was pulled in at runtime.
 */

export { TaskCoordinator } from './task_coordinator';
export type { TaskCoordinatorDeps } from './task_coordinator';
export type {
  CapacitySnapshot,
  ClaimedTaskBatch,
  ClaimedTaskRef,
  ClaimCycleStats,
  CoordinatorContext,
  CoordinatorLogger,
  CoordinatorToExecutorMessage,
  CoordinatorWorkerData,
  ExecutionReport,
  ExecutorToCoordinatorMessage,
  SerializedTaskTypeDefinition,
} from './types';
