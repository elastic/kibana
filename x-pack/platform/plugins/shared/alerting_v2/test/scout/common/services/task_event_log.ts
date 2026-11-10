/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client as EsClient } from '@elastic/elasticsearch';
import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';

/**
 * Internal helpers for querying the Task Manager event log. Used by services
 * that need to wait for deterministic task-run signals (rule executor,
 * dispatcher).
 */

const TASK_MANAGER_EVENT_LOG_INDEX = '.kibana-event-log*';
const TASK_MANAGER_EVENT_PROVIDER = 'taskManager';
const TASK_RUN_EVENT_ACTION = 'task-run';

/**
 * Fields of a `task-run` document these helpers read. `TData` is whatever the
 * task type put under `kibana.task.data`, which differs per task type.
 */
interface TaskRunEventSource<TData> {
  kibana?: { task?: { data?: TData } };
}

interface TaskRunQueryParams {
  taskId: string;
  /** Inclusive lower bound on `event.start`. Unbounded when omitted. */
  sinceMs?: number;
}

/**
 * Matches the `task-run` entries Task Manager emitted for `taskId`. The id is
 * already rule-scoped, so `sinceMs` is only needed to separate runs from
 * earlier phases of the same test.
 */
const buildTaskRunQuery = ({ taskId, sinceMs }: TaskRunQueryParams): QueryDslQueryContainer => ({
  bool: {
    filter: [
      { term: { 'event.provider': TASK_MANAGER_EVENT_PROVIDER } },
      { term: { 'event.action': TASK_RUN_EVENT_ACTION } },
      { term: { 'kibana.task.id': taskId } },
      ...(sinceMs !== undefined ? [{ range: { 'event.start': { gte: sinceMs } } }] : []),
    ],
  },
});

/**
 * Refreshes the event-log index so entries written by a run that has already
 * finished are visible to the queries below.
 */
const refreshEventLog = (esClient: EsClient): Promise<unknown> =>
  esClient.indices.refresh({ index: TASK_MANAGER_EVENT_LOG_INDEX }, { ignore: [404] });

export interface CountTaskRunsParams {
  esClient: EsClient;
  taskId: string;
  sinceMs: number;
}

/**
 * Counts `task-run` event-log entries emitted by Task Manager for `taskId`
 * with `event.start >= sinceMs`.
 */
export const countTaskRuns = async ({
  esClient,
  taskId,
  sinceMs,
}: CountTaskRunsParams): Promise<number> => {
  await refreshEventLog(esClient);

  const result = await esClient.count({
    index: TASK_MANAGER_EVENT_LOG_INDEX,
    ignore_unavailable: true,
    query: buildTaskRunQuery({ taskId, sinceMs }),
  });

  return result.count;
};

export interface FindTaskRunDataParams {
  esClient: EsClient;
  taskId: string;
  sinceMs?: number;
}

/**
 * Returns the custom fields each `task-run` entry carries under
 * `kibana.task.data`, oldest run first. Callers name the shape their own task
 * type writes.
 *
 * Runs that reported nothing are omitted rather than returned as empty
 * objects: Task Manager writes the key only when the task type set it, so
 * their absence is the signal that a run never got far enough to report.
 */
export const findTaskRunData = async <TData extends object>({
  esClient,
  taskId,
  sinceMs,
}: FindTaskRunDataParams): Promise<TData[]> => {
  await refreshEventLog(esClient);

  const result = await esClient.search<TaskRunEventSource<TData>>({
    index: TASK_MANAGER_EVENT_LOG_INDEX,
    ignore_unavailable: true,
    query: buildTaskRunQuery({ taskId, sinceMs }),
    sort: [{ 'event.start': 'asc' }],
    size: 100,
  });

  return result.hits.hits
    .map((hit) => hit._source?.kibana?.task?.data)
    .filter((data): data is TData => data !== undefined);
};
