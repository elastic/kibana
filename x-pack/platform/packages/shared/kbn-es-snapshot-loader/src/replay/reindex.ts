/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client } from '@elastic/elasticsearch';
import type { Logger } from '@kbn/logging';
import pRetry from 'p-retry';
import { extractDataStreamName, getErrorMessage } from '../utils';
import { TEMP_INDEX_PREFIX } from '.';
import { REPLAY_PIPELINE_NAME } from './pipeline';

export function getDataStreamName(indexName: string): string {
  const originalName = indexName.startsWith(TEMP_INDEX_PREFIX)
    ? indexName.slice(TEMP_INDEX_PREFIX.length)
    : indexName;
  return extractDataStreamName(originalName) ?? originalName;
}

export async function reindexThroughPipeline({
  esClient,
  logger,
  sourceIndex,
  destIndex,
  isDataStream,
}: {
  esClient: Client;
  logger: Logger;
  sourceIndex: string;
  destIndex: string;
  isDataStream: boolean;
}): Promise<string> {
  logger.debug(`Reindexing to ${destIndex}`);

  try {
    const response = await esClient.reindex({
      wait_for_completion: false,
      requests_per_second: -1,
      slices: 'auto',
      source: { index: sourceIndex, size: 5000 },
      dest: {
        index: destIndex,
        pipeline: REPLAY_PIPELINE_NAME,
        op_type: isDataStream ? 'create' : 'index',
      },
    });

    if (!response.task) {
      throw new Error(`Reindex did not return a task ID for ${sourceIndex}`);
    }

    return response.task as string;
  } catch (error) {
    logger.error(`Failed to start reindex for ${destIndex}`);
    throw error;
  }
}

export async function waitForReindexTask({
  esClient,
  logger,
  taskId,
}: {
  esClient: Client;
  logger: Logger;
  taskId: string;
}): Promise<{ total: number; created: number; failures: number }> {
  return pRetry(
    async () => {
      const taskResponse = await esClient.tasks.get({ task_id: taskId });

      if (!taskResponse.completed) {
        throw new Error('Task not completed');
      }

      const status = taskResponse.task?.status as {
        total?: number;
        created?: number;
        failures?: unknown[];
      };
      const responseFailures = (taskResponse.response as { failures?: unknown[] })?.failures ?? [];

      if (taskResponse.error) {
        const err = taskResponse.error as {
          type?: string;
          reason?: string;
          caused_by?: { type?: string; reason?: string };
        };
        const errorMsg =
          err.reason ||
          err.caused_by?.reason ||
          (err.type ? `${err.type}: ${JSON.stringify(err)}` : JSON.stringify(err));
        throw new pRetry.AbortError(`Reindex task failed: ${errorMsg}`);
      }

      const result = {
        total: status?.total ?? 0,
        created: status?.created ?? 0,
        failures: (status?.failures ?? []).length + responseFailures.length,
      };

      if (result.failures > 0) {
        logger.warn(`Reindex had ${result.failures} failures`);
        const sampleFailures = responseFailures.slice(0, 3);
        for (const failure of sampleFailures) {
          const cause = (failure as { cause?: { type?: string; reason?: string } })?.cause;
          const reason = cause?.reason?.split('\n')[0]?.slice(0, 80) ?? 'unknown';
          logger.debug(`  - ${cause?.type ?? 'error'}: ${reason}`);
        }
        if (responseFailures.length > 3) {
          logger.debug(`  ... and ${responseFailures.length - 3} more`);
        }
      }
      logger.debug(`Reindexed ${result.created} documents`);
      return result;
    },
    { retries: 60, minTimeout: 1000, maxTimeout: 30000, factor: 1.5 }
  );
}

interface ReindexJob {
  sourceIndex: string;
  destIndex: string;
  isDataStream: boolean;
}

export async function reindexAllIndices({
  esClient,
  logger,
  restoredIndices,
  originalIndices,
  concurrency,
}: {
  esClient: Client;
  logger: Logger;
  restoredIndices: string[];
  originalIndices: string[];
  concurrency?: number;
}): Promise<string[]> {
  const successfullyReindexed: string[] = [];

  const jobs: ReindexJob[] = restoredIndices.map((sourceIndex, i) => {
    const destIndex = getDataStreamName(originalIndices[i]);
    const isDataStream =
      destIndex.startsWith('logs-') ||
      destIndex.startsWith('metrics-') ||
      destIndex.startsWith('traces-');
    return { sourceIndex, destIndex, isDataStream };
  });

  const batchSize = concurrency ?? jobs.length;
  const concurrencyLabel = concurrency ? `concurrency: ${concurrency}` : 'all at once';
  logger.info(`Starting parallel reindex of ${jobs.length} indices (${concurrencyLabel})`);

  for (let i = 0; i < jobs.length; i += batchSize) {
    const batch = jobs.slice(i, i + batchSize);
    if (concurrency) {
      logger.debug(
        `Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(jobs.length / batchSize)}`
      );
    }

    const taskResults = await Promise.all(
      batch.map(async (job) => {
        try {
          const taskId = await reindexThroughPipeline({ esClient, logger, ...job });
          return { job, taskId };
        } catch (error) {
          logger.error(`Failed to start reindex for ${job.destIndex}: ${getErrorMessage(error)}`);
          return { job, taskId: null };
        }
      })
    );

    await Promise.all(
      taskResults.map(async ({ job, taskId }) => {
        if (!taskId) return;
        try {
          const result = await waitForReindexTask({ esClient, logger, taskId });
          if (result.failures === 0 && result.created > 0)
            successfullyReindexed.push(job.destIndex);
        } catch (err) {
          logger.error(`Failed to reindex ${job.destIndex}: ${getErrorMessage(err)}`);
        }
      })
    );
  }

  logger.info(
    `Reindex completed: ${successfullyReindexed.length}/${jobs.length} indices successful`
  );
  return successfullyReindexed;
}
