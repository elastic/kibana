/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client as EsClient } from '@elastic/elasticsearch';

/**
 * Internal helpers for querying the Task Manager event log. Used by services
 * that need to wait for deterministic task-run signals (rule executor,
 * dispatcher).
 */

const TASK_MANAGER_EVENT_LOG_INDEX = '.kibana-event-log*';
const TASK_MANAGER_EVENT_PROVIDER = 'taskManager';
const TASK_RUN_EVENT_ACTION = 'task-run';

export interface CountTaskRunsParams {
  esClient: EsClient;
  taskId: string;
  sinceMs: number;
}

/**
 * Counts `task-run` event-log entries emitted by Task Manager for `taskId`
 * with `event.start >= sinceMs`. Refreshes the event-log index first so
 * recently written entries are visible to the query.
 */
export const countTaskRuns = async ({
  esClient,
  taskId,
  sinceMs,
}: CountTaskRunsParams): Promise<number> => {
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
