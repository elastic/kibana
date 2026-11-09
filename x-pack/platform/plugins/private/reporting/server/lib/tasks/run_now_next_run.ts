/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ConcreteTaskInstance, TaskRunCreatorFunction } from '@kbn/task-manager-plugin/server';

type TaskState = ConcreteTaskInstance['state'];
type AnyRunResult = Awaited<ReturnType<ReturnType<TaskRunCreatorFunction>['run']>>;
type RunResult = Exclude<AnyRunResult, undefined | void>;

// Task state key holding the occurrence that was pending when Run now was requested.
const RUN_NOW_NEXT_RUN_AT = 'runNowNextRunAt';

/** Records the pending occurrence so the run started by Run now can hand it back to Task Manager. */
export const setRunNowNextRunAt = (state: TaskState, nextRunAt: Date): TaskState => ({
  ...state,
  [RUN_NOW_NEXT_RUN_AT]: nextRunAt.toISOString(),
});

/**
 * Task Manager computes the next rrule occurrence from the run's `runAt`, which Run now sets to the
 * current time. Returning the saved occurrence instead keeps the schedule's cadence unchanged.
 */
export const applyRunNowNextRunAt = (
  state: TaskState | undefined,
  runResult: AnyRunResult
): AnyRunResult => {
  const { [RUN_NOW_NEXT_RUN_AT]: savedNextRunAt, ...remainingState } = state ?? {};
  if (savedNextRunAt === undefined) {
    return runResult;
  }

  const result: RunResult | undefined = runResult || undefined;

  const resultState = { ...remainingState, ...(result?.state ?? {}) };
  delete resultState[RUN_NOW_NEXT_RUN_AT];

  // The runner already chose when to run next, for example a retry.
  if (result?.runAt || result?.schedule) {
    return { ...result, state: resultState };
  }

  const nextRunAt = typeof savedNextRunAt === 'string' ? new Date(savedNextRunAt) : undefined;
  // A Run now that finished after the saved occurrence lets Task Manager pick the next one.
  if (!nextRunAt || Number.isNaN(nextRunAt.getTime()) || nextRunAt.getTime() <= Date.now()) {
    return { ...result, state: resultState };
  }

  // The runner did not set a schedule (checked above); clearing it lets `runAt` be returned.
  return { ...result, schedule: undefined, state: resultState, runAt: nextRunAt };
};
