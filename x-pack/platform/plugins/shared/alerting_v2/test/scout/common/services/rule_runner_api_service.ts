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
import type { ReportedRun, RuleExecutorTaskApiService } from './rule_executor_task_api_service';
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
  /** Poll budget; defaults to `POLL_TIMEOUT_MS`. Raise it when runs are slow under load. */
  timeoutMs?: number;
}

export interface WaitForReportedRunParams {
  ruleId: string;
  /** Accepts the run a spec is waiting for. */
  match: (run: ReportedRun) => boolean;
  /** Lower bound (inclusive) on the run start; defaults to every run so far. */
  since?: Date;
  spaceId?: string;
  /**
   * Poll budget; defaults to `POLL_TIMEOUT_MS`. A disabled rule rejects `_run`,
   * so its only runs come from the scheduler — pass a budget above the schedule
   * interval to catch one.
   */
  timeoutMs?: number;
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
  /** Runs the rule until some run reports a `kibana.task.data` matching `match`, and returns it. */
  waitForReportedRun: (params: WaitForReportedRunParams) => Promise<ReportedRun>;
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
  ruleExecutorTask: Pick<RuleExecutorTaskApiService, 'countRuns' | 'findReportedRuns'>;
}): RuleRunnerApiService => {
  const pollUntilAtLeast = (
    min: number,
    count: () => Promise<number>,
    countCompletedRuns: () => Promise<number>,
    requestRun: () => Promise<number>,
    intervalMs: number,
    timeoutMs: number = POLL_TIMEOUT_MS
  ) => {
    // Completed executor-task runs observed when we last drove `_run`. A run stays
    // "in flight" until that count advances; while one is in flight we skip `_run` so
    // a run completing mid-poll cannot stack an extra execution (and extra event batch).
    // This is tracked separately from `count` because the condition may be filtered
    // (e.g. by event status), so a completed run need not advance it — yet we must keep
    // driving executions until the condition holds.
    let drivenAtRuns: number | undefined;
    return expect
      .poll(
        async () => {
          // Snapshot the runs before the condition, so a run landing between the two reads is
          // observed by the condition read instead of looking like a run that produced nothing.
          const completedRuns = await countCompletedRuns();
          const current = await count();
          if (current >= min) return current;

          const runInFlight = drivenAtRuns !== undefined && completedRuns <= drivenAtRuns;

          if (!runInFlight) {
            drivenAtRuns = completedRuns;
            await requestRun();
          }

          return current;
        },
        { timeout: timeoutMs, intervals: [intervalMs] }
      )
      .toBeGreaterThanOrEqual(min);
  };

  return {
    waitForEvents: (ruleId, min, filter, { intervalMs = POLL_INTERVAL_MS } = {}) =>
      measurePerformanceAsync(log, 'ruleRunner.waitForEvents', () =>
        pollUntilAtLeast(
          min,
          async () => (await ruleEvents.find(ruleId, filter)).length,
          // Total completed runs for the task; only its monotonic growth matters here,
          // so count from epoch rather than a window bound.
          () => ruleExecutorTask.countRuns({ ruleId, since: new Date(0) }),
          () => runRule(ruleId),
          intervalMs
        )
      ),

    waitForExecutions: ({
      ruleId,
      runs,
      since = new Date(),
      spaceId = DEFAULT_SPACE_ID,
      timeoutMs,
    }) =>
      measurePerformanceAsync(log, 'ruleRunner.waitForExecutions', () => {
        const countRuns = () => ruleExecutorTask.countRuns({ ruleId, since, spaceId });
        return pollUntilAtLeast(
          runs,
          countRuns,
          countRuns,
          () => runRule(ruleId, { spaceId }),
          POLL_INTERVAL_MS,
          timeoutMs
        );
      }),

    waitForReportedRun: ({
      ruleId,
      match,
      since,
      spaceId = DEFAULT_SPACE_ID,
      timeoutMs = POLL_TIMEOUT_MS,
    }) =>
      measurePerformanceAsync(log, 'ruleRunner.waitForReportedRun', async () => {
        let matched: ReportedRun | undefined;

        await expect
          .poll(
            async () => {
              // A disabled rule rejects the request (swallowed by `runRule`); its
              // run then arrives from the scheduler instead of this poll.
              await runRule(ruleId, { spaceId });
              matched = (await ruleExecutorTask.findReportedRuns({ ruleId, since, spaceId })).find(
                match
              );
              return matched !== undefined;
            },
            { timeout: timeoutMs, intervals: [POLL_INTERVAL_MS] }
          )
          .toBe(true);

        return matched!;
      }),

    runThen: (ruleId, read) => async () => {
      await runRule(ruleId);
      return read();
    },
  };
};
