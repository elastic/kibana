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
import type { StreamDocsStat } from '../../../../common';

interface MeteringStatsResponse {
  datastreams: Array<{
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

  // Use _metering/stats API for serverless when a secondary auth user client is available.
  if (isServerless && esClientAsSecondaryAuthUser) {
    try {
      const meteringStatsByStream = await getDataStreamsMeteringStats({
        esClient: esClientAsSecondaryAuthUser,
        dataStreams: streamNames,
      });

      const meteringResults: StreamDocsStat[] = [];
      for (const streamName of streamNames) {
        const stats = meteringStatsByStream[streamName];
        const totalDocs = stats?.totalDocs ?? 0;
        if (totalDocs > 0) {
          meteringResults.push({
            stream: streamName,
            count: totalDocs,
          });
        }
      }

      return meteringResults;
    } catch {
      return [];
    }
  }

  const dataStreamsByName = await getDataStreamsByName({ esClient });

  const streams = streamNames
    .map((name) => dataStreamsByName.get(name))
    .filter(Boolean) as IndicesGetDataStreamResponse['data_streams'];

  if (!streams.length) {
    return [];
  }

  const lastBackingIndexByStream = getLastBackingIndexByStream(streams);
  const allBackingIndices = Array.from(new Set(lastBackingIndexByStream.values()));

  if (!allBackingIndices.length) {
    return [];
  }

  const statsResponse = await esClient.indices.stats({
    index: allBackingIndices,
    metric: ['docs'],
  });

  const indicesStats = statsResponse.indices;

  const results: StreamDocsStat[] = [];

  for (const [streamName, indexName] of lastBackingIndexByStream.entries()) {
    const stats: IndicesStatsIndicesStats | undefined = indicesStats?.[indexName];
    const docsCount = stats?.primaries?.docs?.count ?? 0;

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

  const dataStreamsByName = await getDataStreamsByName({ esClient });

  const streams = streamNames
    .map((name) => dataStreamsByName.get(name))
    .filter(Boolean) as IndicesGetDataStreamResponse['data_streams'];

  if (!streams.length) {
    return [];
  }

  // Build the list of (stream, last backing index) pairs we want to query.
  const queries = streams
    .map((stream) => {
      const indices = stream.indices;
      const lastBackingIndex = indices[indices.length - 1]?.index_name;
      if (!lastBackingIndex) {
        return null;
      }
      return { streamName: stream.name, index: lastBackingIndex };
    })
    .filter(
      (q): q is { streamName: string; index: string } =>
        q != null && Boolean(q.streamName) && Boolean(q.index)
    );

  if (!queries.length) {
    return [];
  }

  const results: StreamDocsStat[] = [];
  const chunkSize = 100;

  for (let i = 0; i < queries.length; i += chunkSize) {
    const chunk = queries.slice(i, i + chunkSize);

    // Each request in msearch is a pair of header/body lines.
    const body = chunk.flatMap(({ index }) => [
      { index },
      {
        size: 0,
        track_total_hits: true,
        query: {
          exists: {
            field: '_ignored',
          },
        },
      },
    ]);

    const { responses } = await esClient.msearch<{ _ignored?: string[] }>({
      body,
    });

    responses.forEach((response: any, idx: number) => {
      const { streamName } = chunk[idx];

      // Skip errored responses.
      if (!response || response.error) {
        return;
      }

      const totalHits =
        typeof response.hits.total === 'number'
          ? response.hits.total
          : response.hits.total?.value ?? 0;

      if (totalHits > 0) {
        results.push({
          stream: streamName,
          count: totalHits,
        });
      }
    });
  }

  return results;
}

async function getDataStreamsByName({
  esClient,
}: {
  esClient: ElasticsearchClient;
}): Promise<Map<string, IndicesGetDataStreamResponse['data_streams'][number]>> {
  const { data_streams: dataStreams } = await esClient.indices.getDataStream();

  return new Map(dataStreams.map((ds) => [ds.name, ds] as const));
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

  const { datastreams: dataStreamsStats } = chunkResults.reduce((result, chunkResult) =>
    deepMerge(result, chunkResult)
  );

  return dataStreamsStats.reduce(
    (acc, dataStream) => ({
      ...acc,
      [dataStream.name]: {
        sizeBytes: dataStream.size_in_bytes,
        totalDocs: dataStream.num_docs,
      },
    }),
    {} as Record<string, { size?: string; sizeBytes: number; totalDocs: number }>
  );
}
