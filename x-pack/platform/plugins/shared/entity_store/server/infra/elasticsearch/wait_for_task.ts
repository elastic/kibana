/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import type { TaskId } from '@elastic/elasticsearch/lib/api/types';
import { setTimeout as sleep } from 'timers/promises';
import pRetry from 'p-retry';

export interface WaitForTaskOptions {
  esClient: ElasticsearchClient;
  taskId: TaskId;
  logger?: Logger;
  signal?: AbortSignal;
  /** Milliseconds before the first retry attempt. Defaults to pRetry's built-in value (1000ms). */
  minTimeout?: number;
  /** Maximum milliseconds between retries. Defaults to pRetry's built-in value (Infinity). */
  maxTimeout?: number;
  /** Retry indefinitely when true. Defaults to pRetry's built-in value (false). */
  forever?: boolean;
}

/**
 * Polls an Elasticsearch task (submitted with wait_for_completion: false) until
 * it reports completion, logging a debug line on each waiting interval.
 *
 * Throws immediately (via AbortError) when the task itself reports an error.
 */
export const waitForTaskToComplete = async <T>({
  esClient,
  taskId,
  logger,
  signal,
  minTimeout,
  maxTimeout,
  forever,
}: WaitForTaskOptions): Promise<T> => {
  return pRetry(
    async () => {
      if (signal?.aborted) {
        throw new pRetry.AbortError('Task polling aborted');
      }

      const taskResponse = await esClient.tasks.get(
        { task_id: String(taskId), wait_for_completion: false },
        { signal }
      );

      if (taskResponse.error) {
        throw new pRetry.AbortError(
          `Task "${taskId}" failed: ${
            taskResponse.error.reason ?? JSON.stringify(taskResponse.error)
          }`
        );
      }

      if (!taskResponse.completed) {
        logger?.debug(`Waiting for task "${taskId}" to complete...`);
        throw new Error(`Waiting for task "${taskId}" to complete...`);
      }

      const failures = (taskResponse.response as { failures?: unknown[] } | undefined)?.failures;
      if (failures?.length) {
        logger?.warn(`Task "${taskId}" completed with ${failures.length} document failures`);
      }

      return taskResponse.response as T;
    },
    {
      // Only forward options that were explicitly provided — undefined values
      // would override pRetry's built-in defaults, which is undesirable.
      ...(minTimeout !== undefined && { minTimeout }),
      ...(maxTimeout !== undefined && { maxTimeout }),
      ...(forever !== undefined && { forever }),
    }
  );
};

class TaskFailedError extends Error {}

export interface PollTaskUntilOptions {
  esClient: ElasticsearchClient;
  taskId: TaskId;
  /** Epoch milliseconds after which polling stops and `pending` is returned. Omit to wait until the task finishes. */
  deadline?: number;
  /** Longest wait between two polls. */
  pollIntervalMs: number;
  /** First wait between polls. It doubles after each poll up to `pollIntervalMs`. Defaults to `pollIntervalMs`. */
  minPollIntervalMs?: number;
  logger?: Logger;
  signal?: AbortSignal;
}

export type PollTaskUntilResult<T> =
  | { status: 'completed'; response: T }
  | { status: 'pending' }
  | { status: 'missing' };

/**
 * Polls an Elasticsearch task until it completes or the deadline passes.
 *
 * Returns `missing` when the task no longer exists (the node running it restarted, or it was
 * cancelled), so the caller can start it again. Errors reading the task are treated as transient
 * and retried until the deadline. Throws when the task itself reports an error.
 */
export const pollTaskUntil = async <T>({
  esClient,
  taskId,
  deadline = Infinity,
  pollIntervalMs,
  minPollIntervalMs = pollIntervalMs,
  logger,
  signal,
}: PollTaskUntilOptions): Promise<PollTaskUntilResult<T>> => {
  let waitMs = Math.min(minPollIntervalMs, pollIntervalMs);
  while (true) {
    if (signal?.aborted) {
      throw new Error('Task polling aborted');
    }

    try {
      const taskResponse = await esClient.tasks.get(
        { task_id: String(taskId), wait_for_completion: false },
        { signal }
      );

      if (taskResponse.error) {
        throw new TaskFailedError(
          `Task "${taskId}" failed: ${
            taskResponse.error.reason ?? JSON.stringify(taskResponse.error)
          }`
        );
      }

      if (taskResponse.completed) {
        const failures = (taskResponse.response as { failures?: unknown[] } | undefined)?.failures;
        if (failures?.length) {
          logger?.warn(`Task "${taskId}" completed with ${failures.length} document failures`);
        }
        return { status: 'completed', response: taskResponse.response as T };
      }
      logger?.debug(`Waiting for task "${taskId}" to complete...`);
    } catch (err) {
      if (err instanceof TaskFailedError || signal?.aborted) {
        throw err;
      }
      if (err?.meta?.statusCode === 404) {
        return { status: 'missing' };
      }
      logger?.warn(`Failed to read task "${taskId}", will retry: ${err?.message ?? err}`);
    }

    const remainingMs = deadline - Date.now();
    if (remainingMs <= 0) {
      return { status: 'pending' };
    }
    await sleep(Math.min(waitMs, remainingMs), undefined, { signal }).catch(() => {});
    waitMs = Math.min(waitMs * 2, pollIntervalMs);
  }
};

/**
 * Asks Elasticsearch to stop a task. A task that already finished or no longer exists is not an error.
 */
export const cancelTask = async ({
  esClient,
  taskId,
  logger,
}: {
  esClient: ElasticsearchClient;
  taskId: TaskId;
  logger?: Logger;
}): Promise<void> => {
  try {
    await esClient.tasks.cancel({ task_id: String(taskId) });
  } catch (err) {
    if (err?.meta?.statusCode === 404) {
      return;
    }
    logger?.warn(`Could not cancel task "${taskId}": ${err?.message ?? err}`);
  }
};
