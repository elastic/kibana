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

const TASK_MANAGER_EVENT_LOG_INDEX = '.kibana-event-log*';
const TASK_MANAGER_INDEX = '.kibana_task_manager';
const TASK_MANAGER_EVENT_PROVIDER = 'taskManager';
const TASK_RUN_EVENT_ACTION = 'task-run';
const DEFAULT_SPACE_ID = 'default';

/**
 * Task manager task statuses that mean the task is currently being executed
 * (or about to be executed).
 */
const RUNNING_TASK_STATUSES = ['claiming', 'running'];

export interface WaitForExecutorRunsParams {
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

export interface WaitForExecutorTaskDrainedParams {
  ruleId: string;
  spaceId?: string;
}

/**
 * Test-time accessor for task manager state that the rule executor task
 * produces. Used to wait for deterministic conditions instead of sleeping by
 * wall-clock time:
 *
 *   - `waitForExecutorRuns` — polls `.kibana-event-log*` for `task-run`
 *     events the executor task produces.
 *   - `waitForExecutorTaskDrained` — polls `.kibana_task_manager` until the
 *     executor task is no longer in `claiming`/`running` status (or until the
 *     document is gone, e.g. after rule delete).
 */
export interface TaskExecutionsApiService {
  waitForExecutorRuns: (params: WaitForExecutorRunsParams) => Promise<void>;
  waitForExecutorTaskDrained: (params: WaitForExecutorTaskDrainedParams) => Promise<void>;
}

const buildExecutorTaskId = (ruleId: string, spaceId: string): string =>
  `${ALERTING_RULE_EXECUTOR_TASK_TYPE}:${spaceId}:${ruleId}`;

export const getTaskExecutionsApiService = ({
  log,
  esClient,
}: {
  log: ScoutLogger;
  esClient: EsClient;
}): TaskExecutionsApiService => {
  const countExecutorRuns = async ({
    taskId,
    sinceMs,
  }: {
    taskId: string;
    sinceMs: number;
  }): Promise<number> => {
    await esClient.indices.refresh({ index: TASK_MANAGER_EVENT_LOG_INDEX }, { ignore: [404] });

    const result = await esClient.count({
      index: TASK_MANAGER_EVENT_LOG_INDEX,
      ignore_unavailable: true,
      query: {
        bool: {
          filter: [
            { term: { 'event.provider': TASK_MANAGER_EVENT_PROVIDER } },
            { term: { 'event.action': TASK_RUN_EVENT_ACTION } },
            { term: { 'kibana.task.id': taskId } },
            { range: { 'event.start': { gte: sinceMs } } },
          ],
        },
      },
    });

    return result.count;
  };

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

  return {
    waitForExecutorRuns: ({ ruleId, runs, since, spaceId = DEFAULT_SPACE_ID }) =>
      measurePerformanceAsync(log, 'taskExecutions.waitForExecutorRuns', async () => {
        const taskId = buildExecutorTaskId(ruleId, spaceId);
        const sinceMs = (since ?? new Date()).getTime();

        await expect
          .poll(() => countExecutorRuns({ taskId, sinceMs }), {
            timeout: POLL_TIMEOUT_MS,
            intervals: [POLL_INTERVAL_MS],
          })
          .toBeGreaterThanOrEqual(runs);
      }),

    waitForExecutorTaskDrained: ({ ruleId, spaceId = DEFAULT_SPACE_ID }) =>
      measurePerformanceAsync(log, 'taskExecutions.waitForExecutorTaskDrained', async () => {
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
