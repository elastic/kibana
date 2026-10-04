/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ScoutLogger } from '@kbn/scout';
import { measurePerformanceAsync } from '@kbn/scout';
import { expect } from '@kbn/scout/api';
import { POLL_INTERVAL_MS, POLL_TIMEOUT_MS } from '../constants';
import type { RuleEventFilter, RuleEventsApiService } from './rule_events_api_service';
import type { RuleExecutorTaskApiService } from './rule_executor_task_api_service';
import type { RunRule } from './rules_api_service';

const DEFAULT_SPACE_ID = 'default';

export interface RuleRunnerPollOptions {
  /** Delay between polls, and therefore between requested runs; defaults to `POLL_INTERVAL_MS`. */
  intervalMs?: number;
}

export interface WaitForExecutionsParams {
  ruleId: string;
  /** Minimum number of executor task runs that must be observed since `since`. */
  runs: number;
  /** Lower bound (inclusive) for the run start; defaults to the time of the call. */
  since?: Date;
  spaceId?: string;
}

/**
 * Drives rule executions until a condition holds. Scheduled runs are at least
 * 1m apart, so every poll whose condition is unmet requests a run through `_run`;
 * a 409 (run already in flight) is expected and the next poll retries.
 */
export interface RuleRunnerApiService {
  /** Runs the rule until at least `min` `.rule-events` documents match `filter`. */
  waitForEvents: (
    ruleId: string,
    min: number,
    filter?: RuleEventFilter,
    options?: RuleRunnerPollOptions
  ) => Promise<void>;
  /** Runs the rule until its executor task has completed at least `runs` runs. */
  waitForExecutions: (params: WaitForExecutionsParams) => Promise<void>;
  /** Wraps `read` for `expect.poll` so every poll requests a run before reading. */
  runThen: <T>(ruleId: string, read: () => Promise<T>) => () => Promise<T>;
}

export const getRuleRunnerApiService = ({
  log,
  runRule,
  ruleEvents,
  ruleExecutorTask,
}: {
  log: ScoutLogger;
  runRule: RunRule;
  ruleEvents: Pick<RuleEventsApiService, 'find'>;
  ruleExecutorTask: Pick<RuleExecutorTaskApiService, 'countRuns'>;
}): RuleRunnerApiService => {
  const pollUntilAtLeast = (
    min: number,
    count: () => Promise<number>,
    requestRun: () => Promise<number>,
    intervalMs: number
  ) =>
    expect
      .poll(
        async () => {
          const current = await count();
          if (current < min) await requestRun();
          return current;
        },
        { timeout: POLL_TIMEOUT_MS, intervals: [intervalMs] }
      )
      .toBeGreaterThanOrEqual(min);

  return {
    waitForEvents: (ruleId, min, filter, { intervalMs = POLL_INTERVAL_MS } = {}) =>
      measurePerformanceAsync(log, 'ruleRunner.waitForEvents', () =>
        pollUntilAtLeast(
          min,
          async () => (await ruleEvents.find(ruleId, filter)).length,
          () => runRule(ruleId),
          intervalMs
        )
      ),

    waitForExecutions: ({ ruleId, runs, since = new Date(), spaceId = DEFAULT_SPACE_ID }) =>
      measurePerformanceAsync(log, 'ruleRunner.waitForExecutions', () =>
        pollUntilAtLeast(
          runs,
          () => ruleExecutorTask.countRuns({ ruleId, since, spaceId }),
          () => runRule(ruleId, { spaceId }),
          POLL_INTERVAL_MS
        )
      ),

    runThen: (ruleId, read) => async () => {
      await runRule(ruleId);
      return read();
    },
  };
};
