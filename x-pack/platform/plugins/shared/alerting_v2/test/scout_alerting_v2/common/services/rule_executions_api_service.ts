/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client as EsClient } from '@elastic/elasticsearch';
import type { ScoutLogger } from '@kbn/scout';
import { measurePerformanceAsync } from '@kbn/scout';
import { expect } from '@kbn/scout/api';
import { ALERTING_RULE_EXECUTOR_TASK_TYPE } from '../../../../server/lib/rule_executor/constants';
import { POLL_INTERVAL_MS, POLL_TIMEOUT_MS } from '../constants';
import { countTaskRuns, findTaskRunData } from './task_event_log';

const TASK_MANAGER_INDEX = '.kibana_task_manager';
const DEFAULT_SPACE_ID = 'default';

/**
 * Task manager task statuses that mean the task is currently being executed
 * (or about to be executed).
 */
const RUNNING_TASK_STATUSES = ['claiming', 'running'];

interface WaitForRunsParams {
  ruleId: string;
  /** Minimum number of `task-run` events that must be observed since `since`. */
  runs: number;
  /**
   * Lower bound (inclusive) for `event.start` of matching events. Defaults to
   * the time the call was made, i.e. "wait for `runs` more ticks from now".
   */
  since?: Date;
  spaceId?: string;
}

interface WaitForTaskDrainedParams {
  ruleId: string;
  spaceId?: string;
}

export type ReportedRunStatus = 'success' | 'warning' | 'failed' | 'timeout' | 'skipped';

/**
 * What the rule executor reported about one run, read back from
 * `kibana.task.data` on Task Manager's `task-run` event.
 *
 * The field names are spelled out here instead of imported from the executor
 * so that renaming one on the write side fails a test rather than quietly
 * renaming the expectation along with it. `kibana.task.data` is mapped
 * `flattened`, so these dotted keys are literal keys in `_source`.
 */
export interface ReportedRun {
  status: ReportedRunStatus;
  /** Halt reason, failing step, or failure-reason code. Absent on success. */
  reason?: string;
  'rule.id': string;
  'rule.spaceId': string;
  /** Best-effort on failures: absent when a run threw before it was known. */
  'rule.version'?: number;
  'metrics.signalsGenerated'?: number;
  'metrics.ruleEventsGenerated'?: number;
  'metrics.newEpisodesGenerated'?: number;
  'metrics.rowsReturnedByQuery'?: number;
  'metrics.groupsDroppedByLimit'?: number;
  'metrics.rowsDroppedByLimit'?: number;
}

interface FindReportedRunsParams {
  ruleId: string;
  /** Lower bound (inclusive) on `event.start`. Defaults to every run so far. */
  since?: Date;
  spaceId?: string;
}

interface WaitForReportedRunParams extends FindReportedRunsParams {
  /** Accepts the run a spec is waiting for. */
  match: (run: ReportedRun) => boolean;
}

/**
 * Test-time accessor for the per-rule alerting_v2 rule executor task. Used to
 * wait for deterministic conditions instead of sleeping by wall-clock time:
 *
 *   - `waitForRuns` — polls `.kibana-event-log*` for `task-run` events the
 *     executor task produces.
 *   - `waitForTaskDrained` — polls `.kibana_task_manager` until the executor
 *     task is no longer in `claiming`/`running` status (or until the document
 *     is gone, e.g. after rule delete).
 *   - `findReportedRuns` / `waitForReportedRun` — read what those runs
 *     reported about themselves.
 *
 * The underlying `kibana.task.id` construction (`taskType:spaceId:ruleId`) is
 * an implementation detail; tests pass `ruleId` (and optionally `spaceId`).
 */
export interface RuleExecutionsApiService {
  waitForRuns: (params: WaitForRunsParams) => Promise<void>;
  waitForTaskDrained: (params: WaitForTaskDrainedParams) => Promise<void>;
  /** Every run's `kibana.task.data`, oldest first. */
  findReportedRuns: (params: FindReportedRunsParams) => Promise<ReportedRun[]>;
  /**
   * Polls until some run satisfies `match`, and returns the earliest one that
   * does.
   *
   * Selecting a run by what it reported, rather than taking the newest, is
   * what makes these specs deterministic: a rule keeps ticking on its
   * schedule, so by the time a condition is observable it has usually
   * reported several times and only some of those runs are the one under
   * test.
   */
  waitForReportedRun: (params: WaitForReportedRunParams) => Promise<ReportedRun>;
}

const buildExecutorTaskId = (ruleId: string, spaceId: string): string =>
  `${ALERTING_RULE_EXECUTOR_TASK_TYPE}:${spaceId}:${ruleId}`;

export const getRuleExecutionsApiService = ({
  log,
  esClient,
}: {
  log: ScoutLogger;
  esClient: EsClient;
}): RuleExecutionsApiService => {
  /**
   * Returns `true` when the executor task is not currently being executed:
   * either the task document is absent (after delete), or its `task.status`
   * is not in `claiming`/`running`.
   */
  const isExecutorTaskDrained = async (taskId: string): Promise<boolean> => {
    const result = await esClient.search<{ task: { status: string } }>({
      index: TASK_MANAGER_INDEX,
      query: { term: { _id: `task:${taskId}` } },
      size: 1,
      _source: ['task.status'],
    });

    const hit = result.hits.hits[0];
    if (!hit) return true;

    const status = hit._source?.task?.status;
    return !status || !RUNNING_TASK_STATUSES.includes(status);
  };

  const findReportedRuns: RuleExecutionsApiService['findReportedRuns'] = ({
    ruleId,
    since,
    spaceId = DEFAULT_SPACE_ID,
  }) =>
    measurePerformanceAsync(log, 'ruleExecutions.findReportedRuns', () =>
      findTaskRunData<ReportedRun>({
        esClient,
        taskId: buildExecutorTaskId(ruleId, spaceId),
        sinceMs: since?.getTime(),
      })
    );

  return {
    findReportedRuns,

    waitForReportedRun: async ({ match, ...findParams }) => {
      let matched: ReportedRun | undefined;

      await expect
        .poll(
          async () => {
            matched = (await findReportedRuns(findParams)).find(match);
            return matched !== undefined;
          },
          { timeout: POLL_TIMEOUT_MS, intervals: [POLL_INTERVAL_MS] }
        )
        .toBe(true);

      return matched!;
    },

    waitForRuns: ({ ruleId, runs, since, spaceId = DEFAULT_SPACE_ID }) =>
      measurePerformanceAsync(log, 'ruleExecutions.waitForRuns', async () => {
        const taskId = buildExecutorTaskId(ruleId, spaceId);
        const sinceMs = (since ?? new Date()).getTime();

        await expect
          .poll(() => countTaskRuns({ esClient, taskId, sinceMs }), {
            timeout: POLL_TIMEOUT_MS,
            intervals: [POLL_INTERVAL_MS],
          })
          .toBeGreaterThanOrEqual(runs);
      }),

    waitForTaskDrained: ({ ruleId, spaceId = DEFAULT_SPACE_ID }) =>
      measurePerformanceAsync(log, 'ruleExecutions.waitForTaskDrained', async () => {
        const taskId = buildExecutorTaskId(ruleId, spaceId);

        await expect
          .poll(() => isExecutorTaskDrained(taskId), {
            timeout: POLL_TIMEOUT_MS,
            intervals: [POLL_INTERVAL_MS],
          })
          .toBe(true);
      }),
  };
};
