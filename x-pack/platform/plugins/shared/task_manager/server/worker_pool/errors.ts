/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Thrown when a worker pool run's declared `memoryMb` would exceed the configured memory
 * budget (`unsafe.worker_processes.max_total_memory_mb`) given the memory already reserved by
 * in-flight runs (each reserving its declared `memoryMb` plus `baseline_memory_mb`). Callers
 * should treat this as a retryable capacity error, not a task failure.
 */
export class WorkerPoolAtCapacityError extends Error {
  constructor(requestedMemoryMb: number, availableMemoryMb: number) {
    super(
      `Worker pool is at capacity: requested ${requestedMemoryMb}MB but only ${availableMemoryMb}MB is available in the memory budget.`
    );
    this.name = 'WorkerPoolAtCapacityError';
  }
}

export { WorkerMemoryBudgetExceededError } from './worker_memory_budget_exceeded_error';
