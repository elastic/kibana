/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { setTimeout as sleep } from 'timers/promises';

import type { ElasticsearchClient } from '@kbn/core/server';
import type {
  TasksGetResponse,
  UpdateByQueryRequest,
  UpdateByQueryResponse,
} from '@elastic/elasticsearch/lib/api/types';

import { FleetError } from '../../errors';
import { appContextService } from '../app_context';
import { retryTransientEsErrors } from '../epm/elasticsearch/retry';

export const UPDATE_BY_QUERY_POLL_INTERVAL_MS = 1000;
/**
 * Longest a single update by query is followed. A batch of 10,000 agents normally takes seconds, so
 * hitting this means something is badly wrong, and the task is cancelled rather than left running
 * next to the retry that follows.
 */
export const UPDATE_BY_QUERY_MAX_DURATION_MS = 10 * 60 * 1000;

interface UpdateByQueryTaskOptions {
  pollIntervalMs?: number;
  maxDurationMs?: number;
}

/**
 * The final result of a finished task. `response` is what the task returned when it finished
 * successfully. Without it, the counters of the task's status are the only record of what it did.
 * Per-document `failures` are only available from `response`.
 */
const toUpdateByQueryResponse = (task: TasksGetResponse): UpdateByQueryResponse => {
  if (task.response) {
    return task.response as UpdateByQueryResponse;
  }

  const status = (task.task.status ?? {}) as UpdateByQueryResponse;
  return {
    total: status.total,
    updated: status.updated,
    version_conflicts: status.version_conflicts,
    failures: [],
  };
};

/**
 * Runs an update by query and returns its result, without depending on a single HTTP request
 * staying open until the update is done.
 *
 * With `wait_for_completion: true`, a client timeout leaves the outcome of the call unknown: the
 * update keeps running in Elasticsearch and applies its changes, but the caller never sees the
 * counts. For a caller that records what it updated (the bulk update tags action), those agents
 * are then missing from the record, and a retry that skips agents already updated never adds them.
 *
 * Here the update runs as a task, and its result is read back from the tasks API, so a slow
 * update is waited for instead of lost. Reading the task is retried on transient errors.
 */
export async function updateByQueryAndWait(
  esClient: ElasticsearchClient,
  request: UpdateByQueryRequest,
  {
    pollIntervalMs = UPDATE_BY_QUERY_POLL_INTERVAL_MS,
    maxDurationMs = UPDATE_BY_QUERY_MAX_DURATION_MS,
  }: UpdateByQueryTaskOptions = {}
): Promise<UpdateByQueryResponse> {
  const logger = appContextService.getLogger();

  const started = await esClient.updateByQuery({ ...request, wait_for_completion: false });
  if (started.task === undefined) {
    // No task to follow, the response is already the result.
    return started;
  }

  const taskId = String(started.task);
  const deadline = Date.now() + maxDurationMs;

  for (;;) {
    const task = await retryTransientEsErrors(
      () => esClient.tasks.get({ task_id: taskId, wait_for_completion: false }),
      { logger }
    );

    if (task.completed) {
      if (task.error) {
        throw new FleetError(
          `Update by query task ${taskId} failed: ${JSON.stringify(task.error).slice(0, 1000)}`
        );
      }
      return toUpdateByQueryResponse(task);
    }

    if (Date.now() >= deadline) {
      logger.warn(
        `Update by query task ${taskId} did not finish within ${maxDurationMs}ms, cancelling it`
      );
      try {
        await esClient.tasks.cancel({ task_id: taskId });
      } catch (error) {
        logger.warn(`Could not cancel update by query task ${taskId}: ${error.message}`);
      }
      throw new FleetError(
        `Update by query task ${taskId} did not finish within ${maxDurationMs}ms, status: ${JSON.stringify(
          task.task.status ?? {}
        ).slice(0, 500)}`
      );
    }

    await sleep(pollIntervalMs);
  }
}
