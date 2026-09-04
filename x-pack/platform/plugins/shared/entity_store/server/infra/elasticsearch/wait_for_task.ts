/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import type { TaskId } from '@elastic/elasticsearch/lib/api/types';
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
