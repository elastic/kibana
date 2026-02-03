/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import deepMerge from 'deepmerge';
import { bytePartition } from '@kbn/std';
import { isEmpty } from 'lodash';
import type { IndicesGetDataStreamResponse } from '@elastic/elasticsearch/lib/api/types';
import type { ElasticsearchClient } from '@kbn/core/server';

interface MeteringStatsResponse {
  indices: Array<{
    name: string;
    num_docs: number;
    size_in_bytes: number;
  }>;
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

  if (!chunkResults.length) {
    return {};
  }

  const { indices } = chunkResults.reduce((result, chunkResult) => deepMerge(result, chunkResult));

  return indices.reduce(
    (
      acc: Record<string, { sizeBytes: number; totalDocs: number }>,
      index: { name: string; size_in_bytes: number; num_docs: number }
    ) => ({
      ...acc,
      [index.name]: {
        sizeBytes: index.size_in_bytes,
        totalDocs: index.num_docs,
      },
    }),
    {} as Record<string, { size?: string; sizeBytes: number; totalDocs: number }>
  );
}
