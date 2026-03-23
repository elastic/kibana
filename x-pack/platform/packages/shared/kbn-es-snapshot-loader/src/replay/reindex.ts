/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client } from '@elastic/elasticsearch';
import type {
  BulkIndexByScrollFailure,
  ReindexResponse,
} from '@elastic/elasticsearch/lib/api/types';
import type { ToolingLog } from '@kbn/tooling-log';
import { extractDataStreamName, getErrorMessage } from '../utils';

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

function logReindexFailures(
  failures: Array<BulkIndexByScrollFailure>,
  destIndex: string,
  log: ToolingLog
): void {
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

function isPipelineRejected(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return message.includes('Cannot provide a pipeline when writing to a stream');
}

async function getDefaultPipelineSetting(
  esClient: Client,
  index: string
): Promise<string | undefined> {
  const settings = await esClient.indices.getSettings({ index });
  const indexSettings = settings[index]?.settings?.index;
  return (indexSettings as Record<string, unknown>)?.default_pipeline as string | undefined;
}

async function tryResolveExisting(esClient: Client, name: string): Promise<string | undefined> {
  try {
    const response = await esClient.indices.resolveIndex({
      name,
      expand_wildcards: 'all',
    });
    const dataStreams = response.data_streams ?? [];
    if (dataStreams.length > 0) {
      return name;
    }
    const indices = response.indices ?? [];
    if (indices.length > 0) {
      return name;
    }
  } catch {
    // not found
  }
  return undefined;
}

async function tryCreateDataStream(
  esClient: Client,
  log: ToolingLog,
  name: string
): Promise<boolean> {
  try {
    await esClient.indices.createDataStream({ name });
    log.info(`Created data stream "${name}"`);
    return true;
  } catch (err) {
    log.debug(`Failed to create data stream "${name}": ${getErrorMessage(err)}`);
    return false;
  }
}

async function resolveWriteIndex(
  esClient: Client,
  log: ToolingLog,
  destIndex: string
): Promise<string | undefined> {
  const existing = await tryResolveExisting(esClient, destIndex);
  if (existing) {
    try {
      const dsResponse = await esClient.indices.getDataStream({ name: destIndex });
      const ds = dsResponse.data_streams[0];
      if (ds) {
        return ds.indices[ds.indices.length - 1]?.index_name;
      }
    } catch {
      // not a data stream — return index name directly
    }
    return destIndex;
  }

  const parts = destIndex.split('.');
  for (let i = parts.length - 1; i >= 1; i--) {
    const candidate = parts.slice(0, i).join('.');
    const resolved = await tryResolveExisting(esClient, candidate);
    if (resolved) {
      try {
        const dsResponse = await esClient.indices.getDataStream({ name: candidate });
        const ds = dsResponse.data_streams[0];
        if (ds) {
          return ds.indices[ds.indices.length - 1]?.index_name;
        }
      } catch {
        // not a data stream
      }
      return candidate;
    }
  }

  if (await tryCreateDataStream(esClient, log, destIndex)) {
    const dsResponse = await esClient.indices.getDataStream({ name: destIndex });
    const ds = dsResponse.data_streams[0];
    if (ds) {
      return ds.indices[ds.indices.length - 1]?.index_name;
    }
  }

  return undefined;
}

async function reindexWithDefaultPipeline({
  esClient,
  log,
  sourceIndex,
  destIndex,
  pipelineName,
  requestTimeoutMs,
}: {
  esClient: Client;
  log: ToolingLog;
  sourceIndex: string;
  destIndex: string;
  pipelineName: string;
  requestTimeoutMs: number;
}): Promise<ReindexJobResult> {
  const writeIndex = await resolveWriteIndex(esClient, log, destIndex);
  if (!writeIndex) {
    throw new Error(
      `Cannot resolve write index for "${destIndex}" — no existing index or data stream found`
    );
  }

  log.info(
    `Pipeline rejected for "${destIndex}", falling back to default_pipeline on write index "${writeIndex}"`
  );

  const previousPipeline = await getDefaultPipelineSetting(esClient, writeIndex);

  try {
    await esClient.indices.putSettings({
      index: writeIndex,
      settings: { default_pipeline: pipelineName },
    });

    const response: ReindexResponse = await esClient.reindex(
      {
        wait_for_completion: true,
        source: { index: sourceIndex },
        dest: { index: destIndex, op_type: 'create' },
      },
      { requestTimeout: requestTimeoutMs }
    );

    const failures = response.failures ?? [];
    const timedOut = response.timed_out;
    const created = response.created ?? 0;
    const total = response.total ?? 0;

    if (timedOut) {
      throw new Error(`Reindex timed out for ${destIndex}`);
    }

    if (failures.length > 0) {
      logReindexFailures(failures, destIndex, log);
    }

    log.debug(`Reindexed ${created} documents to ${destIndex} (via default_pipeline fallback)`);
    return { total, created, failures: 0, timedOut: false };
  } finally {
    await esClient.indices
      .putSettings({
        index: writeIndex,
        settings: { default_pipeline: previousPipeline ?? '_none' },
      })
      .catch((err) => {
        log.warning(
          `Failed to restore default_pipeline on "${writeIndex}": ${getErrorMessage(err)}`
        );
      });
  }
}

export async function reindexThroughPipeline({
  esClient,
  log,
  sourceIndex,
  destIndex,
  isDataStream,
  pipelineName,
  requestTimeoutMs = DEFAULT_REINDEX_REQUEST_TIMEOUT_MS,
}: {
  esClient: Client;
  log: ToolingLog;
  sourceIndex: string;
  destIndex: string;
  isDataStream: boolean;
  pipelineName: string;
  requestTimeoutMs?: number;
}): Promise<ReindexJobResult> {
  log.debug(`Reindexing to ${destIndex}`);

  try {
    const response: ReindexResponse = await esClient.reindex(
      {
        wait_for_completion: true,
        source: { index: sourceIndex },
        dest: {
          index: destIndex,
          pipeline: pipelineName,
          op_type: isDataStream ? 'create' : 'index',
        },
      },
      { requestTimeout: requestTimeoutMs }
    );

    const failures = response.failures ?? [];
    const timedOut = response.timed_out;
    const created = response.created ?? 0;
    const total = response.total ?? 0;

    if (timedOut) {
      throw new Error(`Reindex timed out for ${destIndex}`);
    }

    if (failures.length > 0) {
      logReindexFailures(failures, destIndex, log);
    }

    log.debug(`Reindexed ${created} documents to ${destIndex}`);
    return { total, created, failures: 0, timedOut: false };
  } catch (error) {
    if (isPipelineRejected(error)) {
      return reindexWithDefaultPipeline({
        esClient,
        log,
        sourceIndex,
        destIndex,
        pipelineName,
        requestTimeoutMs,
      });
    }
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
}: {
  esClient: Client;
  log: ToolingLog;
  restoredIndices: string[];
  originalIndices: string[];
  concurrency?: number;
  pipelineName: string;
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
          await reindexThroughPipeline({ esClient, log, pipelineName, ...job });
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
