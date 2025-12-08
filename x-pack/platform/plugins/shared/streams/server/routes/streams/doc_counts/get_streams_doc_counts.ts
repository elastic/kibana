/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import deepMerge from 'deepmerge';
import { bytePartition } from '@kbn/std';
import { isEmpty } from 'lodash';
import type {
  IndicesGetDataStreamResponse,
  IndicesStatsIndicesStats,
} from '@elastic/elasticsearch/lib/api/types';
import type { ElasticsearchClient } from '@kbn/core/server';
import type { ESQLSearchResponse } from '@kbn/es-types';
import type { StreamDocsStat } from '../../../../common';

interface MeteringStatsResponse {
  indices: Array<{
    name: string;
    num_docs: number;
    size_in_bytes: number;
  }>;
}

/**
 * Fetches total document counts for multiple streams.
 *
 * The current implementation no longer uses a time range. Instead it:
 * 1) calls the indices.getDataStream API to resolve data streams and their backing indices
 * 2) prefers the _metering/stats API (ES3 / serverless) to get total doc counts per data stream
 * 3) falls back to the indices.stats docs metric (stateful) when _metering/stats is unavailable
 */
export async function getDocCountsForStreams(options: {
  isServerless: boolean;
  esClient: ElasticsearchClient;
  /**
   * When available (serverless), this client should be used to call the
   * _metering/stats API as a secondary auth user to ensure proper permissions.
   */
  esClientAsSecondaryAuthUser?: ElasticsearchClient;
  streamNames: string[];
}): Promise<StreamDocsStat[]> {
  const { isServerless, esClient, esClientAsSecondaryAuthUser, streamNames } = options;

  if (!streamNames.length) {
    return [];
  }

  const { data_streams: streams } = await esClient.indices.getDataStream({
    name: streamNames,
  });

  if (!streams.length) {
    return [];
  }

  const lastBackingIndexByStream = getLastBackingIndexByStream(streams);
  const allBackingIndices = Array.from(new Set(lastBackingIndexByStream.values()));

  if (!allBackingIndices.length) {
    return [];
  }

  // Accumulate doc counts per backing index, then map those back to stream names below.
  const docsByBackingIndex: Record<string, number> = {};

  // Use _metering/stats API for serverless when a secondary auth user client is available.
  if (isServerless && esClientAsSecondaryAuthUser) {
    const meteringStatsByBackingIndex = await getDataStreamsMeteringStats({
      esClient: esClientAsSecondaryAuthUser,
      dataStreams: allBackingIndices,
    });

    for (const [indexName, stats] of Object.entries(meteringStatsByBackingIndex)) {
      docsByBackingIndex[indexName] = stats.totalDocs ?? 0;
    }
  } else {
    // Stateful fallback – use indices.stats, chunked for large numbers of indices.
    const indicesStats: Record<string, IndicesStatsIndicesStats> = {};
    const chunkSize = 100;

    for (let i = 0; i < allBackingIndices.length; i += chunkSize) {
      const indexChunk = allBackingIndices.slice(i, i + chunkSize);

      const statsResponse = await (esClientAsSecondaryAuthUser ?? esClient).indices.stats({
        index: indexChunk,
        metric: ['docs'],
      });

      if (statsResponse.indices) {
        Object.assign(indicesStats, statsResponse.indices);
      }
    }

    for (const [indexName, stats] of Object.entries(indicesStats)) {
      const docsCount = stats.primaries?.docs?.count ?? 0;
      docsByBackingIndex[indexName] = docsCount;
    }
  }

  const results: StreamDocsStat[] = [];

  for (const [streamName, indexName] of lastBackingIndexByStream.entries()) {
    const docsCount = docsByBackingIndex[indexName] ?? 0;

    if (docsCount > 0) {
      results.push({
        stream: streamName,
        count: docsCount,
      });
    }
  }

  return results;
}

/**
 * Fetches degraded document counts for multiple streams.
 *
 * For each stream we:
 * 1) resolve the data stream and its backing indices via indices.getDataStream
 * 2) pick the last backing index
 * 3) run a search against that index with an _ignored exists query
 */
export async function getDegradedDocCountsForStreams(options: {
  esClient: ElasticsearchClient;
  streamNames: string[];
}): Promise<StreamDocsStat[]> {
  const { esClient, streamNames } = options;

  if (!streamNames.length) {
    return [];
  }

  const { data_streams: streams } = await esClient.indices.getDataStream({
    name: streamNames,
  });

  if (!streams.length) {
    return [];
  }

  const lastBackingIndexByStream = getLastBackingIndexByStream(streams);
  const streamIndexPairs = Array.from(lastBackingIndexByStream.entries()).map(
    ([streamName, index]) => ({ streamName, index })
  );

  if (!streamIndexPairs.length) {
    return [];
  }

  const results: StreamDocsStat[] = [];
  const chunkSize = 100;

  for (let i = 0; i < streamIndexPairs.length; i += chunkSize) {
    const chunk = streamIndexPairs.slice(i, i + chunkSize);

    const indicesInChunk = chunk.map(({ index }) => index);

    // Build a filters aggregation keyed by index name so we get per-index counts in a single search.
    const filters: Record<string, any> = {};
    for (const index of indicesInChunk) {
      filters[index] = {
        term: {
          _index: index,
        },
      };
    }

    const response = await esClient.search<any>({
      index: indicesInChunk,
      size: 0,
      track_total_hits: false,
      query: {
        exists: {
          field: '_ignored',
        },
      },
      aggs: {
        per_index: {
          filters: {
            filters,
          },
        },
      },
    });

    const buckets =
      // @ts-expect-error Aggregations are not strongly typed here
      response.aggregations?.per_index?.buckets ?? {};

    for (const { streamName, index } of chunk) {
      const bucket = buckets[index];
      const docCount: number = bucket?.doc_count ?? 0;

      if (docCount > 0) {
        results.push({
          stream: streamName,
          count: docCount,
        });
      }
    }
  }

  return results;
}

/**
 * Fetches failed document counts for multiple streams.
 *
 * The implementation:
 * 1) resolves failure store data streams and their backing indices via indices.getDataStream
 * 2) runs an ES|QL query over the failure store streams to get failed doc counts per backing index
 * 3) aggregates failed doc counts across backing indices for each original stream
 */
export async function getFailedDocCountsForStreams(options: {
  esClient: ElasticsearchClient;
  streamNames: string[];
  start: number;
  end: number;
}): Promise<StreamDocsStat[]> {
  const { esClient, streamNames, start, end } = options;

  if (!streamNames.length) {
    return [];
  }

  const { data_streams: streams } = await esClient.indices.getDataStream({
    name: streamNames,
  });

  if (!streams.length) {
    return [];
  }

  // Map each fs backing index of the streams to its base stream name.
  const backingIndexToStream = new Map<string, string>();

  for (const stream of streams) {
    for (const index of stream.failure_store?.indices ?? []) {
      backingIndexToStream.set(index.index_name, stream.name);
    }
  }

  if (!backingIndexToStream.size) {
    return [];
  }

  const startIso = new Date(start).toISOString();
  const endIso = new Date(end).toISOString();

  const esqlQuery = `
FROM *::failures METADATA _index
| WHERE @timestamp >= "${startIso}" AND @timestamp <= "${endIso}"
| STATS failed_count = COUNT(*) BY backing_index = _index
`.trim();

  const response = (await esClient.esql.query({
    query: esqlQuery,
    drop_null_columns: true,
  })) as ESQLSearchResponse;

  const backingIndexCol = response.columns.findIndex((col) => col.name === 'backing_index');
  const failedCountCol = response.columns.findIndex((col) => col.name === 'failed_count');

  if (backingIndexCol === -1 || failedCountCol === -1) {
    return [];
  }

  const countsByStream = new Map<string, number>();

  for (const row of response.values) {
    const backingIndex = row[backingIndexCol] as string | undefined;
    const failedCount = Number(row[failedCountCol] ?? 0);

    if (!backingIndex || !Number.isFinite(failedCount)) {
      continue;
    }

    const streamName = backingIndexToStream.get(backingIndex);
    if (!streamName) {
      continue;
    }

    countsByStream.set(streamName, (countsByStream.get(streamName) ?? 0) + failedCount);
  }

  return Array.from(countsByStream.entries()).map(
    ([stream, count]): StreamDocsStat => ({
      stream,
      count,
    })
  );
}

function getLastBackingIndexByStream(
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

async function getDataStreamsMeteringStats({
  esClient,
  dataStreams,
}: {
  esClient: ElasticsearchClient;
  dataStreams: string[];
}): Promise<Record<string, { size?: string; sizeBytes: number; totalDocs: number }>> {
  if (!dataStreams.length) {
    return {};
  }

  const chunks = bytePartition(dataStreams);

  if (isEmpty(chunks)) {
    return {};
  }

  const chunkResults = await Promise.all(
    chunks.map((dataStreamsChunk) =>
      esClient.transport.request<MeteringStatsResponse>({
        method: 'GET',
        path: `/_metering/stats/` + dataStreamsChunk.join(','),
      })
    )
  );

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
