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

/** A task to follow, and what is needed to read it. */
interface TaskToFollow {
  esClient: ElasticsearchClient;
  taskId: string;
  logger: Logger;
  pollIntervalMs: number;
}

const statusOf = (task: TasksGetResponse) => JSON.stringify(task.task.status ?? {}).slice(0, 500);

/**
 * Whether an update by query ended before it went through all of its documents. A failure also
 * ends the request early, but the documents it left are no more recorded for that: the caller
 * records the failures, and the documents that were neither updated nor failed are still to do.
 */
const endedEarly = (response: UpdateByQueryResponse): boolean => {
  if (response.total === undefined) {
    return false;
  }
  const processed =
    (response.updated ?? 0) +
    (response.deleted ?? 0) +
    (response.noops ?? 0) +
    (response.version_conflicts ?? 0);
  return processed < response.total;
};

/**
 * The final result of a finished task. `response` is what the task returned when it finished
 * successfully. Without it, the counters of the task's status are the only record of what it did.
 * Per-document `failures` are only available from `response`.
 */
const toUpdateByQueryResponse = (
  task: TasksGetResponse,
  { taskId, logger }: TaskToFollow
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
 * The outcome of a task that has finished. Once a cancellation was requested the outcome is that of
 * a cancelled task, if the task stopped before it went through every document. Asking for a
 * cancellation does not mean the task was stopped by it, as it can finish between the last poll and
 * the request: a result that went through every document stays a plain success, so that it is not
 * turned into an error and a retry.
 */
const outcomeOf = (
  task: TasksGetResponse,
  toFollow: TaskToFollow,
  cancellationRequested: boolean
): UpdateByQueryTaskResponse => {
  if (task.error) {
    throw new FleetError(
      `Update by query task ${toFollow.taskId} failed: ${JSON.stringify(task.error).slice(0, 1000)}`
    );
  }
  const response = toUpdateByQueryResponse(task, toFollow);
  if (!cancellationRequested || response.canceled || !endedEarly(response)) {
    return response;
  }
  return { ...response, canceled: CANCELED_REASON };
};

/**
 * Reads the task until it has finished, or `maxDurationMs` has passed, in which case it says what
 * the status of the task was. Reading the task is retried on transient errors.
 */
const followTask = async (
  { esClient, taskId, logger, pollIntervalMs }: TaskToFollow,
  maxDurationMs: number
): Promise<{ finished: TasksGetResponse } | { stillRunning: string }> => {
  const deadline = Date.now() + maxDurationMs;
  for (;;) {
    const task = await retryTransientEsErrors(
      () => esClient.tasks.get({ task_id: taskId, wait_for_completion: false }),
      { logger }
    );
    if (task.completed) {
      return { finished: task };
    }
    if (Date.now() >= deadline) {
      return { stillRunning: statusOf(task) };
    }
    await sleep(pollIntervalMs);
  }
};

/**
 * Asks for the task to be cancelled, and says why it was not if it was not. The request can
 * succeed without cancelling anything: the task already finished, or its node did not take the
 * cancellation.
 */
const cancelTask = async ({ esClient, taskId }: TaskToFollow): Promise<string | undefined> => {
  try {
    const cancelled = await esClient.tasks.cancel({ task_id: taskId });
    return cancelled?.node_failures?.length
      ? JSON.stringify(cancelled.node_failures).slice(0, 500)
      : undefined;
  } catch (error) {
    return error.message;
  }
};

/**
 * Reads a task that was asked to stop until it has finished, for at most `cancelWaitMs`. A task
 * that is not stopped by then has an outcome that is not known, so there is nothing to hand to the
 * caller to record, and it throws.
 *
 * The wait is bounded, and `retryTransientEsErrors` backs off for up to a minute between attempts.
 * So a poll here is a single request that gives up with the time that is left, and one that fails
 * is tried again until that time is up.
 */
const followCancelledTask = async (
  { esClient, taskId, logger, pollIntervalMs }: TaskToFollow,
  {
    cancelWaitMs,
    lastStatus,
    cancelFailure,
  }: { cancelWaitMs: number; lastStatus: string; cancelFailure?: string }
): Promise<TasksGetResponse> => {
  const cancelRequestedAt = Date.now();
  const timeLeft = () => cancelWaitMs - (Date.now() - cancelRequestedAt);
  let status = lastStatus;
  let lastPollError: string | undefined;

  for (;;) {
    await sleep(Math.max(0, Math.min(pollIntervalMs, timeLeft())));
    const waitLeft = timeLeft();
    if (waitLeft <= 0) {
      throw new FleetError(
        `Update by query task ${taskId} did not stop within ${cancelWaitMs}ms of being cancelled, status: ${status}${
          cancelFailure ? `, cancellation failed: ${cancelFailure}` : ''
        }${lastPollError ? `, last error: ${lastPollError}` : ''}`
      );
    }

    try {
      const task = await esClient.tasks.get(
        { task_id: taskId, wait_for_completion: false },
        { requestTimeout: waitLeft }
      );
      if (task.completed) {
        return task;
      }
      status = statusOf(task);
    } catch (error) {
      lastPollError = error.message;
      logger.warn(
        `Could not read update by query task ${taskId} after cancelling it: ${error.message}`
      );
    }
  }
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
 * update is waited for instead of lost.
 *
 * A task that runs past `maxDurationMs` is cancelled. The documents it already updated stay
 * updated, so the cancelled task is followed until it stops and its partial outcome is returned
 * with `canceled` set, for the caller to decide what to do with it: a retry that selects documents
 * by what the update changed would skip the ones that were updated.
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

  const toFollow: TaskToFollow = { esClient, taskId: String(started.task), logger, pollIntervalMs };

  const followed = await followTask(toFollow, maxDurationMs);
  if ('finished' in followed) {
    return outcomeOf(followed.finished, toFollow, false);
  }

  logger.warn(
    `Update by query task ${toFollow.taskId} did not finish within ${maxDurationMs}ms, cancelling it`
  );
  const cancelFailure = await cancelTask(toFollow);
  if (cancelFailure !== undefined) {
    // A cancellation that failed may still have taken effect, and one that failed because the task
    // was just finishing still leaves its result to record, so the task is followed all the same.
    logger.warn(
      `Could not cancel update by query task ${toFollow.taskId}: ${cancelFailure}. Following it for up to ${cancelWaitMs}ms`
    );
  }
  const stopped = await followCancelledTask(toFollow, {
    cancelWaitMs,
    lastStatus: followed.stillRunning,
    cancelFailure,
  });
  return outcomeOf(stopped, toFollow, true);
}
