/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/*
 * This module contains the logic for polling the task manager index for new work.
 */

import stats from 'stats-lite';
import { isNumber, random } from 'lodash';
import { merge, of, Observable, combineLatest, ReplaySubject } from 'rxjs';
import { filter, map } from 'rxjs';
import { Option, none, some, isSome, Some } from 'fp-ts/lib/Option';
import { isOk } from '../lib/result_type';
import { TaskLifecycleEvent } from '../polling_lifecycle';
import { isTaskPollingCycleEvent } from '../task_events';
import { ClaimAndFillPoolResult } from '../lib/fill_pool';
import { createRunningAveragedStat } from '../monitoring/task_run_calculators';
import { getCapacityInWorkers } from '../task_pool';

/**
 * Emits a delay amount in ms to apply to polling whenever the task store exceeds a threshold of claim claimClashes
 */
export function delayOnClaimConflicts(
  capacityConfiguration$: Observable<number>,
  pollIntervalConfiguration$: Observable<number>,
  taskLifecycleEvents$: Observable<TaskLifecycleEvent>,
  claimClashesPercentageThreshold: number,
  runningAverageWindowSize: number
): Observable<number> {
  const claimConflictQueue = createRunningAveragedStat<number>(runningAverageWindowSize);
  // return a subject to allow multicast and replay the last value to new subscribers
  const multiCastDelays$ = new ReplaySubject<number>(1);
  merge(
    of(0),
    combineLatest([
      capacityConfiguration$,
      pollIntervalConfiguration$,
      taskLifecycleEvents$.pipe(
        map<TaskLifecycleEvent, Option<number>>((taskEvent: TaskLifecycleEvent) =>
          isTaskPollingCycleEvent(taskEvent) &&
          isOk<ClaimAndFillPoolResult, unknown>(taskEvent.event) &&
          isNumber(taskEvent.event.value.stats?.tasksConflicted)
            ? some(taskEvent.event.value.stats!.tasksConflicted)
            : none
        ),
        filter<Option<number>>((claimClashes) => isSome(claimClashes)),
        map((claimClashes: Option<number>) => (claimClashes as Some<number>).value)
      ),
    ]).pipe(
      map(([capacity, pollInterval, latestClaimConflicts]) => {
        // convert capacity to maxWorkers
        const maxWorkers = getCapacityInWorkers(capacity);

        // add latest claimConflict count to queue
        claimConflictQueue(latestClaimConflicts);

        const emitWhenExceeds = (claimClashesPercentageThreshold * maxWorkers) / 100;
        if (
          // avoid calculating average if the new value isn't above the Threshold
          latestClaimConflicts >= emitWhenExceeds &&
          // only calculate average and emit value if above or equal to Threshold
          stats.percentile(claimConflictQueue(), 0.5) >= emitWhenExceeds
        ) {
          return some(pollInterval);
        }
        return none;
      }),
      filter<Option<number>>((pollInterval) => isSome(pollInterval)),
      map<Option<number>, number>((maybePollInterval) => {
        const pollInterval = (maybePollInterval as Some<number>).value;
        return random(pollInterval * 0.25, pollInterval * 0.75, false);
      })
    )
  ).subscribe((delay) => {
    multiCastDelays$.next(delay);
  });

  return multiCastDelays$;
}
