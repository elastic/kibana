/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  CatIndicesIndicesRecord,
  IndicesGetDataStreamResponse,
  IndicesStatsIndicesStats,
} from '@elastic/elasticsearch/lib/api/types';
import type { ElasticsearchClient } from '@kbn/core/server';
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
  streamNames: string[];
  // Kept for backwards compatibility with the existing route schema, but ignored.
  start?: string;
  end?: string;
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

  const backingIndicesByStream = getBackingIndicesByStream(streams);
  const allBackingIndices = Array.from(
    new Set(Array.from(backingIndicesByStream.values()).flatMap((indices) => indices))
  );

  if (!allBackingIndices.length) {
    return [];
  }

  // Try the indices.stats API first (Stateful-only API)
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
    // If indices stats are not available (e.g. limited serverless environments),
    // fall back to the cat indices API, which is more widely available.
    try {
      const catResponse = await esClient.cat.indices({
        index: allBackingIndices,
        h: ['index', 'docs.count'],
        format: 'json',
      });

      const docsCountByIndex = new Map<string, number>();

      for (const row of catResponse as CatIndicesIndicesRecord[]) {
        const indexName = row.index;
        const rawDocsCount =
          (row['docs.count'] as string | undefined) ??
          // Some client aliases use docsCount instead of docs.count
          (row as unknown as { docsCount?: string }).docsCount ??
          undefined;

        if (!indexName) continue;

        const parsed = rawDocsCount != null ? Number(rawDocsCount) : 0;
        const docsCount = Number.isFinite(parsed) ? parsed : 0;
        docsCountByIndex.set(indexName, docsCount);
      }

      const results: StreamDocsStat[] = [];

      for (const [streamName, indices] of backingIndicesByStream.entries()) {
        const totalDocs = indices.reduce((sum, indexName) => {
          return sum + (docsCountByIndex.get(indexName) ?? 0);
        }, 0);

        if (totalDocs > 0) {
          results.push({
            stream: streamName,
            count: totalDocs,
          });
        }
      }

      return results;
    } catch {
      // If cat indices is also unavailable, return an empty result instead of failing the request.
      return [];
    }
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
