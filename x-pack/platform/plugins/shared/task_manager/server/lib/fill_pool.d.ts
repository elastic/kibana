/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ClaimOwnershipResult } from '../queries/task_claiming';
import type { ConcreteTaskInstance } from '../task';
import type { WithTaskTiming } from '../task_events';
import type { TaskPoolRunResult } from '../task_pool';
import type { TaskManagerRunner } from '../task_running';
import type { Result } from './result_type';
export declare enum FillPoolResult {
  Failed = 'Failed',
  NoAvailableWorkers = 'NoAvailableWorkers',
  NoTasksClaimed = 'NoTasksClaimed',
  RunningAtCapacity = 'RunningAtCapacity',
  RanOutOfCapacity = 'RanOutOfCapacity',
  PoolFilled = 'PoolFilled',
}
export type ClaimAndFillPoolResult = Partial<Pick<ClaimOwnershipResult, 'stats'>> & {
  result: FillPoolResult;
};
export type TimedFillPoolResult = WithTaskTiming<ClaimAndFillPoolResult>;
/**
 * Given a function that runs a batch of tasks (e.g. taskPool.run), a function
 * that fetches task records (e.g. store.fetchAvailableTasks), and a function
 * that converts task records to the appropriate task runner, this function
 * fills the pool with work.
 *
 * This is annoyingly general in order to simplify testing.
 *
 * @param run - a function that runs a batch of tasks (e.g. taskPool.run)
 * @param fetchAvailableTasks - a function that fetches task records (e.g. store.fetchAvailableTasks)
 * @param converter - a function that converts task records to the appropriate task runner
 */
export declare function fillPool(
  fetchAvailableTasks: () => Promise<Result<ClaimOwnershipResult, FillPoolResult>>,
  converter: (taskInstance: ConcreteTaskInstance) => TaskManagerRunner,
  run: (tasks: TaskManagerRunner[]) => Promise<TaskPoolRunResult>
): Promise<TimedFillPoolResult>;
