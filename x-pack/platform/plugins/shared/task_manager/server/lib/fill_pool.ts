/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ClaimOwnershipResult } from '../queries/task_claiming';
import { ConcreteTaskInstance } from '../task';
import { WithTaskTiming, startTaskTimer } from '../task_events';
import { TaskPoolRunResult } from '../task_pool';
import { TaskManagerRunner } from '../task_running';
import { Result, isOk } from './result_type';

export enum FillPoolResult {
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
export async function fillPool(
  fetchAvailableTasks: () => Promise<Result<ClaimOwnershipResult, FillPoolResult>>,
  converter: (taskInstance: ConcreteTaskInstance) => TaskManagerRunner,
  run: (tasks: TaskManagerRunner[]) => Promise<TaskPoolRunResult>
): Promise<TimedFillPoolResult> {
  const stopTaskTimer = startTaskTimer();
  const augmentTimingTo = (
    result: FillPoolResult,
    stats?: ClaimOwnershipResult['stats']
  ): TimedFillPoolResult => ({
    result,
    stats,
    timing: stopTaskTimer(),
  });

  const claimResults = await fetchAvailableTasks();
  if (isOk(claimResults)) {
    if (!claimResults.value.docs.length) {
      return augmentTimingTo(FillPoolResult.NoTasksClaimed, claimResults.value.stats);
    }

    const taskPoolRunResult = await run(claimResults.value.docs.map(converter)).then(
      (runResult) => ({
        result: runResult,
        stats: claimResults.value.stats,
      })
    );

    switch (taskPoolRunResult.result) {
      case TaskPoolRunResult.RanOutOfCapacity:
        return augmentTimingTo(FillPoolResult.RanOutOfCapacity, taskPoolRunResult.stats);
      case TaskPoolRunResult.RunningAtCapacity:
        return augmentTimingTo(FillPoolResult.RunningAtCapacity, taskPoolRunResult.stats);
      case TaskPoolRunResult.NoTaskWereRan:
        return augmentTimingTo(FillPoolResult.NoTasksClaimed, taskPoolRunResult.stats);
      default:
        return augmentTimingTo(FillPoolResult.PoolFilled, taskPoolRunResult.stats);
    }
  }

  return augmentTimingTo(claimResults.error);
}
