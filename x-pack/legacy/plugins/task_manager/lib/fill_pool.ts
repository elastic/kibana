/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { performance } from 'perf_hooks';
import { TaskPoolRunResult } from '../task_pool';

export enum FillPoolResult {
  NoTasksClaimed = 'NoTasksClaimed',
  RanOutOfCapacity = 'RanOutOfCapacity',
}

type BatchRun<T> = (tasks: T[]) => Promise<TaskPoolRunResult>;
type Fetcher<T> = () => Promise<T[]>;
type Converter<T1, T2> = (t: T1) => T2;

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
export async function fillPool<TRecord, TRunner>(
  run: BatchRun<TRunner>,
  fetchAvailableTasks: Fetcher<TRecord>,
  converter: Converter<TRecord, TRunner>
): Promise<FillPoolResult> {
  performance.mark('fillPool.start');
  while (true) {
    const instances = await fetchAvailableTasks();

    if (!instances.length) {
      performance.mark('fillPool.bailNoTasks');
      performance.measure(
        'fillPool.activityDurationUntilNoTasks',
        'fillPool.start',
        'fillPool.bailNoTasks'
      );
      return FillPoolResult.NoTasksClaimed;
    }

    const tasks = instances.map(converter);

    if ((await run(tasks)) === TaskPoolRunResult.RanOutOfCapacity) {
      performance.mark('fillPool.bailExhaustedCapacity');
      performance.measure(
        'fillPool.activityDurationUntilExhaustedCapacity',
        'fillPool.start',
        'fillPool.bailExhaustedCapacity'
      );
      return FillPoolResult.RanOutOfCapacity;
    }
    performance.mark('fillPool.cycle');
  }
}
