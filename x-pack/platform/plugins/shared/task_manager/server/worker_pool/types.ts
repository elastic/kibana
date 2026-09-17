/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Payload handed to the generic worker-side dispatcher (`task_worker.ts`). Must be
 * structured-cloneable: no functions, class instances, or Kibana service handles.
 */
export interface TaskWorkerPayload {
  /**
   * Absolute path (from `require.resolve(...)` at registration time) to the module that
   * performs the work. Its default export is invoked with `input`.
   */
  moduleId: string;
  /**
   * Structured-cloneable input forwarded to the worker module's default export.
   */
  input: unknown;
}

/**
 * Options for a single worker pool run.
 */
export interface WorkerPoolRunOptions {
  /**
   * Declared memory requirement (MB) for this run, reserved against the pool's memory
   * budget for the duration of the run. Required so Task Manager can tell upfront whether
   * there is room to run another task with such requirements.
   */
  memoryMb: number;
  /**
   * Aborting cancels the run. Piscina terminates the underlying thread, so a cancelled run
   * cannot be resumed - a fresh thread is spun up for the next run.
   */
  signal?: AbortSignal;
}
