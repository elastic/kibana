/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client } from '@elastic/elasticsearch';
import type { ReindexResponse } from '@elastic/elasticsearch/lib/api/types';
import type { ToolingLog } from '@kbn/tooling-log';
import { extractDataStreamName, getErrorMessage } from '../utils';
import { TIMESTAMP_REINDEX_SCRIPT } from './pipeline';

export interface DestinationInfo {
  destIndex: string;
  isDataStream: boolean;
}

export interface ReindexJobResult {
  total: number;
  created: number;
  failures: number;
  timedOut: boolean;
}

export const DEFAULT_REINDEX_REQUEST_TIMEOUT_MS = 30 * 60 * 1000;

export function getDestinationInfo(originalIndex: string): DestinationInfo {
  const dataStreamName = extractDataStreamName(originalIndex);
  return {
    destIndex: dataStreamName ?? originalIndex,
    isDataStream: dataStreamName != null,
  };
}

export async function reindexThroughPipeline({
  esClient,
  log,
  sourceIndex,
  destIndex,
  isDataStream,
  pipelineName,
  maxTimestamp,
  useInlineScript = false,
  requestTimeoutMs = DEFAULT_REINDEX_REQUEST_TIMEOUT_MS,
}: {
  esClient: Client;
  log: ToolingLog;
  sourceIndex: string;
  destIndex: string;
  isDataStream: boolean;
  pipelineName: string;
  maxTimestamp?: string;
  useInlineScript?: boolean;
  requestTimeoutMs?: number;
}): Promise<ReindexJobResult> {
  if (useInlineScript && !maxTimestamp) {
    throw new Error(`maxTimestamp is required when using inline script for ${destIndex}`);
  }

  log.debug(`Reindexing to ${destIndex}${useInlineScript ? ' (inline script)' : ''}`);

  const runReindex = (opType: 'create' | 'index'): Promise<ReindexResponse> =>
    esClient.reindex(
      {
        wait_for_completion: true,
        source: { index: sourceIndex },
        dest: {
          index: destIndex,
          ...(!useInlineScript && { pipeline: pipelineName }),
          op_type: opType,
        },
        ...(useInlineScript && {
          script: {
            lang: 'painless',
            source: TIMESTAMP_REINDEX_SCRIPT,
            params: { max_timestamp: maxTimestamp },
          },
        }),
      },
      { requestTimeout: requestTimeoutMs }
    );

  // The destination may resolve to a data stream even when the source index name
  // didn't look like a backing index (e.g. it's already the data-stream name and a
  // `logs-*`/`metrics-*` data-stream template matches). Data streams reject
  // `op_type: index` with "only ... create ... allowed in data streams" — which ES
  // surfaces either as per-doc `failures` (200 response) or as a thrown
  // ResponseError. Detect it in both forms and retry as `create` so replay
  // populates the data stream instead of failing every doc.
  const isDataStreamOpTypeError = (value: unknown): boolean =>
    JSON.stringify(value ?? '').includes('op_type of create are allowed in data streams');

  try {
    let response: ReindexResponse;
    try {
      response = await runReindex(isDataStream ? 'create' : 'index');
      if (!isDataStream && isDataStreamOpTypeError(response)) {
        log.debug(
          `Destination ${destIndex} is a data stream; retrying reindex with op_type=create`
        );
        response = await runReindex('create');
      }
    } catch (initialError) {
      if (
        !isDataStream &&
        isDataStreamOpTypeError((initialError as { meta?: unknown })?.meta ?? initialError)
      ) {
        log.debug(
          `Destination ${destIndex} is a data stream; retrying reindex with op_type=create`
        );
        response = await runReindex('create');
      } else {
        throw initialError;
      }
    }

    const failures = response.failures ?? [];
    const timedOut = response.timed_out;
    const created = response.created ?? 0;
    const total = response.total ?? 0;

    if (timedOut) {
      throw new Error(`Reindex timed out for ${destIndex}`);
    }

    if (failures.length > 0) {
      log.warning(`Reindex had ${failures.length} failures`);
      const sampleFailures = failures.slice(0, 3);
      for (const failure of sampleFailures) {
        const cause = failure.cause;
        const reason = cause?.reason?.split('\n')[0]?.slice(0, 120) ?? 'unknown';
        log.debug(`  - ${cause?.type ?? 'error'}: ${reason}`);
      }
      if (failures.length > 3) {
        log.debug(`  ... and ${failures.length - 3} more`);
      }
      throw new Error(`Reindex had failures for ${destIndex}`);
    }

    log.debug(`Reindexed ${created} documents to ${destIndex}`);
    return { total, created, failures: 0, timedOut: false };
  } catch (error) {
    log.error(`Failed to start reindex for ${destIndex}`);
    throw error;
  }
}

interface ReindexJob {
  sourceIndex: string;
  destIndex: string;
  isDataStream: boolean;
}

export async function reindexAllIndices({
  esClient,
  log,
  restoredIndices,
  originalIndices,
  concurrency,
  pipelineName,
  maxTimestamp,
  shouldUseInlineScript,
}: {
  esClient: Client;
  log: ToolingLog;
  restoredIndices: string[];
  originalIndices: string[];
  concurrency?: number;
  pipelineName: string;
  maxTimestamp?: string;
  shouldUseInlineScript?: (destIndex: string) => boolean;
}): Promise<string[]> {
  const successfullyReindexed: string[] = [];

  const jobs: ReindexJob[] = restoredIndices.map((sourceIndex, i) => {
    const { destIndex, isDataStream } = getDestinationInfo(originalIndices[i]);
    return { sourceIndex, destIndex, isDataStream };
  });

  const batchSize = concurrency ?? jobs.length;
  const concurrencyLabel = concurrency ? `concurrency: ${concurrency}` : 'all at once';
  log.info(`Starting parallel reindex of ${jobs.length} indices (${concurrencyLabel})`);

  for (let i = 0; i < jobs.length; i += batchSize) {
    const batch = jobs.slice(i, i + batchSize);
    if (concurrency) {
      log.debug(
        `Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(jobs.length / batchSize)}`
      );
    }

    await Promise.all(
      batch.map(async (job) => {
        try {
          const useInlineScript = shouldUseInlineScript?.(job.destIndex) ?? false;
          await reindexThroughPipeline({
            esClient,
            log,
            pipelineName,
            useInlineScript,
            maxTimestamp,
            ...job,
          });
          successfullyReindexed.push(job.destIndex);
        } catch (error) {
          log.error(`Failed to reindex ${job.destIndex}: ${getErrorMessage(error)}`);
        }
      })
    );
  }

  log.info(`Reindex completed: ${successfullyReindexed.length}/${jobs.length} indices successful`);
  return successfullyReindexed;
}
