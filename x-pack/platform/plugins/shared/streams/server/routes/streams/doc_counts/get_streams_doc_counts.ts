/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  IndicesGetDataStreamResponse,
  IndicesStatsIndicesStats,
} from '@elastic/elasticsearch/lib/api/types';
import type { ElasticsearchClient } from '@kbn/core/server';
import { getDataStreamsMeteringStats } from '@kbn/dataset-quality-plugin/server/routes/data_streams/get_data_streams_metering_stats';
import type { StreamDocsStat } from '../../../../common';

/**
 * Fetches total document counts for multiple streams.
 *
 * The current implementation no longer uses a time range. Instead it:
 * 1) calls the indices.getDataStream API to resolve data streams and their backing indices
 * 2) prefers the _metering/stats API (ES3 / serverless) to get total doc counts per data stream
 * 3) falls back to the indices.stats docs metric (stateful) when _metering/stats is unavailable
 */
export async function getDocCountsForStreams(options: {
  esClient: ElasticsearchClient;
  /**
   * When available (serverless), this client should be used to call the
   * _metering/stats API as a secondary auth user to ensure proper permissions.
   */
  esClientAsSecondaryAuthUser?: ElasticsearchClient;
  streamNames: string[];
  // Kept for backwards compatibility with the existing route schema, but ignored.
  start?: string;
  end?: string;
}): Promise<StreamDocsStat[]> {
  const { esClient, esClientAsSecondaryAuthUser, streamNames } = options;

  if (!streamNames.length) {
    return [];
  }

  // Prefer _metering/stats for serverless when a secondary auth user client is available.
  if (esClientAsSecondaryAuthUser) {
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
      // Fallback to indices.stats API
    }
  }

  const dataStreamsByName = await getDataStreamsByName({ esClient });

  const streams = streamNames
    .map((name) => dataStreamsByName.get(name))
    .filter(Boolean) as IndicesGetDataStreamResponse['data_streams'];

  if (!streams.length) {
    return [];
  }

  const backingIndicesByStream = getBackingIndicesByStream(streams);
  const allBackingIndices = Array.from(
    new Set(Array.from(backingIndicesByStream.values()).flatMap((indices) => indices))
  );

  if (!allBackingIndices.length) {
    return [];
  }

  try {
    const statsResponse = await esClient.indices.stats({
      index: allBackingIndices,
      metric: ['docs'],
    });

    const indicesStats = statsResponse.indices;

    const results: StreamDocsStat[] = [];

    for (const [streamName, indices] of backingIndicesByStream.entries()) {
      const totalDocs = indices.reduce((sum, indexName) => {
        const stats: IndicesStatsIndicesStats | undefined = indicesStats?.[indexName];
        const docsCount = stats?.primaries?.docs?.count ?? 0;
        return sum + docsCount;
      }, 0);

      if (totalDocs > 0) {
        results.push({
          stream: streamName,
          count: totalDocs,
        });
      }
    }

    return results;
  } catch (e) {
    return [];
  }
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

  const results: StreamDocsStat[] = [];

  for (const stream of streams) {
    const indices = stream.indices;
    const lastBackingIndex = indices[indices.length - 1]?.index_name;
    if (!lastBackingIndex) {
      continue;
    }

    const response = await esClient.search({
      index: lastBackingIndex,
      size: 0,
      track_total_hits: true,
      query: {
        exists: {
          field: '_ignored',
        },
      },
    });

    const totalHits =
      typeof response.hits.total === 'number'
        ? response.hits.total
        : response.hits.total?.value ?? 0;

    if (totalHits > 0) {
      results.push({
        stream: stream.name,
        count: totalHits,
      });
    }
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

function getBackingIndicesByStream(
  dataStreams: IndicesGetDataStreamResponse['data_streams']
): Map<string, string[]> {
  const backingIndicesByStream = new Map<string, string[]>();

  for (const dataStream of dataStreams) {
    backingIndicesByStream.set(
      dataStream.name,
      dataStream.indices.map((index) => index.index_name)
    );
  }

  return backingIndicesByStream;
}
