/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  AggregationsCompositeAggregateKey,
  QueryDslBoolQuery,
  QueryDslQueryContainer,
} from '@elastic/elasticsearch/lib/api/types';
import type { ElasticsearchClient } from '@kbn/core/server';
import type { StreamDocsStat } from '../../../../common';

interface Dataset extends AggregationsCompositeAggregateKey {
  dataset: string;
}

const SIZE_LIMIT = 10000;

export async function getAggregatedDatasetPaginatedResults(options: {
  esClient: ElasticsearchClient;
  index: string;
  start: string;
  end: string;
  query?: QueryDslBoolQuery;
  after?: Dataset;
  prevResults?: StreamDocsStat[];
}): Promise<StreamDocsStat[]> {
  const { esClient, index, query, start, end, after, prevResults = [] } = options;

  const aggs = (afterKey?: Dataset) => ({
    datasets: {
      composite: {
        ...(afterKey ? { after: afterKey } : {}),
        size: SIZE_LIMIT,
        sources: [{ dataset: { terms: { field: '_index' } } }],
      },
    },
  });

  const rangeFilter: QueryDslQueryContainer[] = [
    {
      range: {
        '@timestamp': {
          gte: start,
          lte: end,
        },
      },
    },
  ];

  const bool: QueryDslBoolQuery = {
    ...query,
    filter: [
      ...(query?.filter
        ? Array.isArray(query.filter)
          ? query.filter
          : [query.filter]
        : []),
      ...rangeFilter,
    ],
  };

  const response = await esClient.search({
    index,
    size: 0,
    query: {
      bool,
    },
    aggs: aggs(after),
    ignore_unavailable: true,
  });

  const currResults: StreamDocsStat[] =
    response.aggregations?.datasets.buckets.map((bucket) => ({
      dataset: bucket.key.dataset as string,
      count: bucket.doc_count,
    })) ?? [];

  const results = [...prevResults, ...currResults];

  if (
    response.aggregations?.datasets.after_key &&
    response.aggregations?.datasets.buckets.length === SIZE_LIMIT
  ) {
    return getAggregatedDatasetPaginatedResults({
      esClient,
      index,
      start,
      end,
      after:
        (response.aggregations?.datasets.after_key as {
          dataset: string;
        }) || after,
      prevResults: results,
    });
  }

  const aggregatedResults: Record<string, number> = results.reduce(
    (acc, curr) => {
      const dataset = extractIndexNameFromBackingIndex(curr.dataset);
      acc[dataset] = (acc[dataset] ?? 0) + curr.count;
      return acc;
    },
    {} as Record<string, number>
  );

  return Object.entries(aggregatedResults).map(([dataset, count]) => ({
    dataset,
    count,
  }));
}

const backingIndexPattern = /.(?:ds|fs)-(.*?)-[0-9]{4}\.[0-9]{2}\.[0-9]{2}-[0-9]{6}/;

function extractIndexNameFromBackingIndex(indexString: string): string {
  const match = indexString.match(backingIndexPattern);
  return match ? match[1] : indexString;
}


