/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { setTimeout as sleep } from 'timers/promises';

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
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
/**
 * Longest a cancelled update by query is followed while it stops. A cancelled task stops at its
 * next batch, so this is normally a second or two.
 */
export const UPDATE_BY_QUERY_CANCEL_WAIT_MS = 30 * 1000;

const CANCELED_REASON = 'cancelled after exceeding the maximum duration';

interface UpdateByQueryTaskOptions {
  pollIntervalMs?: number;
  maxDurationMs?: number;
  cancelWaitMs?: number;
}

/**
 * `canceled` is set when the update by query was cancelled before it went through all of its
 * documents. The counters are then the partial outcome: the documents it did update stay updated.
 */
export type UpdateByQueryTaskResponse = UpdateByQueryResponse & { canceled?: string };

/**
 * The final result of a finished task. `response` is what the task returned when it finished
 * successfully. Without it, the counters of the task's status are the only record of what it did.
 * Per-document `failures` are only available from `response`.
 */
const toUpdateByQueryResponse = (
  task: TasksGetResponse,
  taskId: string,
  logger: Logger
): UpdateByQueryTaskResponse => {
  if (task.response) {
    return task.response as UpdateByQueryTaskResponse;
  }

  logger.warn(
    `Update by query task ${taskId} finished without a response, reading its counters from the task status. Per-document failures are not available.`
  );
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
 *
 * A task that runs past `maxDurationMs` is cancelled. The documents it already updated stay
 * updated, and a retry that selects documents by what the update changed would skip them, so the
 * cancelled task is followed until it stops and its partial outcome is returned with `canceled`
 * set. The caller records that outcome, then retries the rest.
 */
export async function updateByQueryAndWait(
  esClient: ElasticsearchClient,
  request: UpdateByQueryRequest,
  {
    pollIntervalMs = UPDATE_BY_QUERY_POLL_INTERVAL_MS,
    maxDurationMs = UPDATE_BY_QUERY_MAX_DURATION_MS,
    cancelWaitMs = UPDATE_BY_QUERY_CANCEL_WAIT_MS,
  }: UpdateByQueryTaskOptions = {}
): Promise<UpdateByQueryTaskResponse> {
  const logger = appContextService.getLogger();

  const started = await esClient.updateByQuery({ ...request, wait_for_completion: false });
  if (started.task === undefined) {
    // No task to follow, the response is already the result.
    return started;
  }

  const taskId = String(started.task);
  const deadline = Date.now() + maxDurationMs;
  let cancelRequestedAt: number | undefined;

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
      const response = toUpdateByQueryResponse(task, taskId, logger);
      return cancelRequestedAt === undefined
        ? response
        : { ...response, canceled: response.canceled ?? CANCELED_REASON };
    }

    const taskStatus = JSON.stringify(task.task.status ?? {}).slice(0, 500);

    if (cancelRequestedAt === undefined) {
      if (Date.now() >= deadline) {
        logger.warn(
          `Update by query task ${taskId} did not finish within ${maxDurationMs}ms, cancelling it`
        );
        try {
          await esClient.tasks.cancel({ task_id: taskId });
          cancelRequestedAt = Date.now();
        } catch (error) {
          logger.warn(`Could not cancel update by query task ${taskId}: ${error.message}`);
          throw new FleetError(
            `Update by query task ${taskId} did not finish within ${maxDurationMs}ms, status: ${taskStatus}`
          );
        }
      }
    } else if (Date.now() - cancelRequestedAt >= cancelWaitMs) {
      // The outcome of this task is unknown, so there is nothing to hand to the caller to record.
      throw new FleetError(
        `Update by query task ${taskId} did not stop within ${cancelWaitMs}ms of being cancelled, status: ${taskStatus}`
      );
    }

    await sleep(pollIntervalMs);
  }
}
