/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { bytePartition } from '@kbn/std';
import { isEmpty } from 'lodash';
import type { IndicesGetDataStreamResponse } from '@elastic/elasticsearch/lib/api/types';
import type { ElasticsearchClient } from '@kbn/core/server';
import { isNotFoundError } from '@kbn/es-errors';
import { lazySchema, z } from '@kbn/zod/v4';
import { MAX_STREAM_NAME_LENGTH } from '@kbn/streams-schema';
import { MAX_STATS_STREAM_NAMES } from '../../../../common/constants';

interface MeteringStatsResponse {
  indices?: Array<{
    name: string;
    num_docs: number;
    size_in_bytes: number;
  }>;
}

// The list endpoints only read these fields. The full response is about 7x larger.
export const DATA_STREAM_INDEX_NAMES_FILTER_PATH = [
  'data_streams.name',
  'data_streams.indices.index_name',
  'data_streams.failure_store.indices.index_name',
];

const statsStreamNamesSchema = () =>
  z.array(z.string().min(1).max(MAX_STREAM_NAME_LENGTH)).min(1).max(MAX_STATS_STREAM_NAMES);

/** Request body of the POST variants of the bulk stats endpoints. */
export const statsStreamNamesBodySchema = lazySchema(() =>
  z.object({ streams: statsStreamNamesSchema() })
);

/** Like {@link statsStreamNamesBodySchema}, plus the time range of the time-bound stats. */
export const statsStreamNamesTimeRangeBodySchema = lazySchema(() =>
  z.object({ streams: statsStreamNamesSchema(), start: z.number(), end: z.number() })
);

const getNamedDataStreams = async (
  esClient: ElasticsearchClient,
  names: string[],
  retries = 3
): Promise<IndicesGetDataStreamResponse['data_streams']> => {
  const { data_streams: resolvedDataStreams = [] } = await esClient.indices.resolveIndex({
    name: names.join(','),
    expand_wildcards: 'open',
    ignore_unavailable: true,
    allow_no_indices: true,
    filter_path: 'data_streams.name',
  });
  const resolvedNames = resolvedDataStreams.map(({ name }) => name);
  if (resolvedNames.length === 0) {
    return [];
  }
  try {
    // filter_path drops `data_streams` entirely when nothing matches.
    const { data_streams: dataStreams = [] } = await esClient.indices.getDataStream({
      name: resolvedNames,
      filter_path: DATA_STREAM_INDEX_NAMES_FILTER_PATH,
    });
    return dataStreams;
  } catch (error) {
    if (!isNotFoundError(error)) {
      throw error;
    }
    // A stream deleted after resolving fails the whole request; resolving again skips it.
    return retries > 0 ? getNamedDataStreams(esClient, resolvedNames, retries - 1) : [];
  }
};

/**
 * Fetches data streams with only their names and backing index names, for the given
 * stream names or all of them. Missing names are skipped.
 */
export async function getDataStreamsWithIndexNames({
  esClient,
  streamName,
  streamNames = streamName ? [streamName] : undefined,
}: {
  esClient: ElasticsearchClient;
  streamName?: string;
  streamNames?: readonly string[];
}): Promise<IndicesGetDataStreamResponse['data_streams']> {
  if (!streamNames) {
    const { data_streams: dataStreams = [] } = await esClient.indices.getDataStream({
      filter_path: DATA_STREAM_INDEX_NAMES_FILTER_PATH,
    });
    return dataStreams;
  }

  const chunks = await processAsyncInChunks({
    items: [...new Set(streamNames)],
    processChunk: (names) => getNamedDataStreams(esClient, names),
  });
  return chunks.flat();
}

/**
 * Returns a mapping from data stream name to its last backing index name.
 */
export function getLastBackingIndexByStream(
  dataStreams: IndicesGetDataStreamResponse['data_streams']
): Map<string, string> {
  const lastBackingIndexByStream = new Map<string, string>();

  for (const dataStream of dataStreams) {
    const indices = dataStream.indices;
    const lastBackingIndex = indices[indices.length - 1]?.index_name;

    if (lastBackingIndex) {
      lastBackingIndexByStream.set(dataStream.name, lastBackingIndex);
    }
  }

  return lastBackingIndexByStream;
}

// Maps each data stream to all its backing indices, for metrics aggregated across the whole stream (older indices may have rolled into e.g. frozen).
export function getAllBackingIndicesByStream(
  dataStreams: IndicesGetDataStreamResponse['data_streams']
): Map<string, string[]> {
  const backingIndicesByStream = new Map<string, string[]>();

  for (const dataStream of dataStreams) {
    const indices = dataStream.indices
      .map((index) => index.index_name)
      .filter((indexName): indexName is string => Boolean(indexName));

    if (indices.length) {
      backingIndicesByStream.set(dataStream.name, indices);
    }
  }

  return backingIndicesByStream;
}

/**
 * Runs an async operation over a list of string items in byte-size-safe chunks.
 */
export async function processAsyncInChunks<T extends string, R>({
  items,
  processChunk,
}: {
  items: T[];
  processChunk: (chunk: T[]) => Promise<R>;
}): Promise<R[]> {
  const chunks = bytePartition(items as string[]) as T[][];

  if (isEmpty(chunks)) {
    return [];
  }

  return Promise.all(chunks.map((chunk) => processChunk(chunk)));
}

/**
 * Fetches metering statistics for a list of data streams using the
 * `/_metering/stats` API, handling large inputs by chunking requests.
 */
export async function getDataStreamsMeteringStats({
  esClient,
  dataStreams,
}: {
  esClient: ElasticsearchClient;
  dataStreams: string[];
}): Promise<Record<string, { size?: string; sizeBytes: number; totalDocs: number }>> {
  if (!dataStreams.length) {
    return {};
  }

  const chunkResults = await processAsyncInChunks<string, MeteringStatsResponse>({
    items: dataStreams,
    processChunk: async (dataStreamsChunk) =>
      esClient.transport.request<MeteringStatsResponse>({
        method: 'GET',
        path: `/_metering/stats/` + dataStreamsChunk.join(','),
      }),
  });

  // Mutate one record so the cost stays linear in the number of entries. Projects can have
  // thousands of backing indices, and this runs on the request path.
  const statsByName: Record<string, { size?: string; sizeBytes: number; totalDocs: number }> = {};

  for (const { indices } of chunkResults) {
    if (!indices) {
      continue;
    }
    for (const { name, size_in_bytes: sizeBytes, num_docs: totalDocs } of indices) {
      statsByName[name] = { sizeBytes, totalDocs };
    }
  }

  return statsByName;
}
