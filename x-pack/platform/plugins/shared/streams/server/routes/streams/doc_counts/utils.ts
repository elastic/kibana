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

/**
 * Fetches data streams with only their names and backing index names, for one stream or all of them.
 */
export async function getDataStreamsWithIndexNames({
  esClient,
  streamName,
}: {
  esClient: ElasticsearchClient;
  streamName?: string;
}): Promise<IndicesGetDataStreamResponse['data_streams']> {
  const request = streamName
    ? esClient.indices.getDataStream({
        name: streamName,
        filter_path: DATA_STREAM_INDEX_NAMES_FILTER_PATH,
      })
    : esClient.indices.getDataStream({ filter_path: DATA_STREAM_INDEX_NAMES_FILTER_PATH });

  try {
    // filter_path drops `data_streams` entirely when nothing matches.
    const { data_streams: dataStreams = [] } = await request;
    return dataStreams;
  } catch (error) {
    if (streamName && isNotFoundError(error)) {
      return [];
    }
    throw error;
  }
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
