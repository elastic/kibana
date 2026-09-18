/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Thrown when a worker process is terminated because it exceeded its declared memory budget.
 * On Linux with cgroups v2 available, this is a kernel-enforced, hard guarantee (see
 * `CgroupEnforcer`); the process cannot consume more than its budget before being OOM-killed.
 * Without cgroups, only the portable V8 heap cap is enforced (see `WorkerPoolService`'s
 * fallback path) - this error is not thrown for RSS overruns in that mode, since those are
 * only observed/logged, never killed on. Callers should treat this as a retryable task
 * failure: the task likely needs a larger `workerResources.memoryMb` declaration.
 */
export class WorkerMemoryBudgetExceededError extends Error {
  constructor(budgetMb: number) {
    super(`Task exceeded its declared memory budget of ${budgetMb}MB and was terminated.`);
    this.name = 'WorkerMemoryBudgetExceededError';
  }
}
