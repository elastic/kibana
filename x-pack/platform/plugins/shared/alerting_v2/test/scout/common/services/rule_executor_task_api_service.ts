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

interface CountRunsParams {
  ruleId: string;
  /** Lower bound (inclusive) for `event.start` of matching events. */
  since: Date;
  spaceId?: string;
}

interface RuleTaskParams {
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

/**
 * Test-time accessor for the per-rule alerting_v2 rule executor task:
 *
 *   - `countRuns` — counts the `task-run` events in `.kibana-event-log*` that
 *     the executor task produced since a point in time.
 *   - `waitForTaskDrained` — polls `.kibana_task_manager` until the executor
 *     task is no longer in `claiming`/`running` status (or until the document
 *     is gone, e.g. after rule delete).
 *   - `waitForTaskScheduled` / `waitForTaskRemoved` — poll `.kibana_task_manager`
 *     until the executor task document exists / no longer exists, so tests can
 *     assert the real scheduling side effect, not just the stored `enabled` flag.
 *   - `findReportedRuns` — reads what those runs reported about themselves,
 *     oldest first.
 *
 * The underlying `kibana.task.id` construction (`taskType:spaceId:ruleId`) is
 * an implementation detail; tests pass `ruleId` (and optionally `spaceId`).
 */
export interface RuleExecutorTaskApiService {
  countRuns: (params: CountRunsParams) => Promise<number>;
  waitForTaskDrained: (params: RuleTaskParams) => Promise<void>;
  waitForTaskScheduled: (params: RuleTaskParams) => Promise<void>;
  waitForTaskRemoved: (params: RuleTaskParams) => Promise<void>;
  /** Every run's `kibana.task.data`, oldest first. */
  findReportedRuns: (params: FindReportedRunsParams) => Promise<ReportedRun[]>;
}

const buildExecutorTaskId = (ruleId: string, spaceId: string): string =>
  `${ALERTING_RULE_EXECUTOR_TASK_TYPE}:${spaceId}:${ruleId}`;

export const getRuleExecutorTaskApiService = ({
  log,
  esClient,
}: {
  log: ScoutLogger;
  esClient: EsClient;
}): RuleExecutorTaskApiService => {
  /**
   * The executor task's `task.status`, or `undefined` when the task document
   * does not exist (e.g. not yet scheduled, or removed on disable/delete).
   */
  const getExecutorTaskStatus = async (taskId: string): Promise<string | undefined> => {
    const result = await esClient.search<{ task: { status: string } }>({
      index: TASK_MANAGER_INDEX,
      query: { term: { _id: `task:${taskId}` } },
      size: 1,
      _source: ['task.status'],
    });

    return result.hits.hits[0]?._source?.task?.status;
  };

  const isExecutorTaskDrained = async (taskId: string): Promise<boolean> => {
    const status = await getExecutorTaskStatus(taskId);
    return !status || !RUNNING_TASK_STATUSES.includes(status);
  };

  const executorTaskExists = async (taskId: string): Promise<boolean> =>
    (await getExecutorTaskStatus(taskId)) !== undefined;

  return {
    countRuns: ({ ruleId, since, spaceId = DEFAULT_SPACE_ID }) =>
      measurePerformanceAsync(log, 'ruleExecutorTask.countRuns', () =>
        countTaskRuns({
          esClient,
          taskId: buildExecutorTaskId(ruleId, spaceId),
          sinceMs: since.getTime(),
        })
      ),

    waitForTaskDrained: ({ ruleId, spaceId = DEFAULT_SPACE_ID }) =>
      measurePerformanceAsync(log, 'ruleExecutorTask.waitForTaskDrained', async () => {
        const taskId = buildExecutorTaskId(ruleId, spaceId);

        await expect
          .poll(() => isExecutorTaskDrained(taskId), {
            timeout: POLL_TIMEOUT_MS,
            intervals: [POLL_INTERVAL_MS],
          })
          .toBe(true);
      }),

    waitForTaskScheduled: ({ ruleId, spaceId = DEFAULT_SPACE_ID }) =>
      measurePerformanceAsync(log, 'ruleExecutorTask.waitForTaskScheduled', async () => {
        const taskId = buildExecutorTaskId(ruleId, spaceId);

        await expect
          .poll(() => executorTaskExists(taskId), {
            timeout: POLL_TIMEOUT_MS,
            intervals: [POLL_INTERVAL_MS],
          })
          .toBe(true);
      }),

    waitForTaskRemoved: ({ ruleId, spaceId = DEFAULT_SPACE_ID }) =>
      measurePerformanceAsync(log, 'ruleExecutorTask.waitForTaskRemoved', async () => {
        const taskId = buildExecutorTaskId(ruleId, spaceId);

        await expect
          .poll(() => executorTaskExists(taskId), {
            timeout: POLL_TIMEOUT_MS,
            intervals: [POLL_INTERVAL_MS],
          })
          .toBe(false);
      }),

    findReportedRuns: ({ ruleId, since, spaceId = DEFAULT_SPACE_ID }) =>
      measurePerformanceAsync(log, 'ruleExecutorTask.findReportedRuns', () =>
        findTaskRunData<ReportedRun>({
          esClient,
          taskId: buildExecutorTaskId(ruleId, spaceId),
          sinceMs: since?.getTime(),
        })
      ),
  };
};
