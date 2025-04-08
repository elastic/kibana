/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { IScopedClusterClient } from '@kbn/core/server';
import { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import type { estypes } from '@elastic/elasticsearch';
import { extractIndexNameFromBackingIndex } from '../../common/utils';

// TODO: Check this limit
const DEFAULT_GROUPS = 1000;

export interface FetchEsQueryOpts {
  index: string;
  groupBy: string[];
  query?: {
    must?: QueryDslQueryContainer | QueryDslQueryContainer[];
  };
  services: {
    scopedClusterClient: IScopedClusterClient;
  };
  dateStart: string;
}

export async function fetchEsQuery({
  index,
  groupBy,
  query = {},
  services,
  dateStart,
}: FetchEsQueryOpts) {
  const { scopedClusterClient } = services;
  const esClient = scopedClusterClient.asCurrentUser;
  const { must } = query;

  const bool = {
    filter: [
      {
        range: {
          '@timestamp': {
            gte: new Date(dateStart).getTime(),
          },
        },
      },
    ],
  };

  const aggs = {
    ...(groupBy.length > 0
      ? {
          dataStreams: {
            ...(groupBy.length === 1
              ? {
                  terms: {
                    field: groupBy[0],
                    size: DEFAULT_GROUPS,
                    order: { _count: 'desc' as const },
                  },
                }
              : {
                  multi_terms: {
                    terms: groupBy.map((field) => ({ field })),
                    size: DEFAULT_GROUPS,
                    order: { _count: 'desc' as const },
                  },
                }),
          },
        }
      : {}),
  };

  const esResult = await esClient.search<
    unknown,
    { dataStreams: estypes.AggregationsStringTermsAggregate }
  >({
    index,
    track_total_hits: false,
    size: 0,
    query: {
      bool: {
        ...bool,
        ...(must ? { must } : {}),
      },
    },
    aggs,
  });

  const dataStreamBuckets =
    (esResult.aggregations?.dataStreams?.buckets as estypes.AggregationsStringTermsBucketKeys[]) ||
    [];

  // Group values by dataStream name instead of backing index name
  const groupedDataStreams = dataStreamBuckets.reduce(
    (acc: Record<string, { bucketKey: string[]; docCount: number }>, bucket) => {
      const dataStream = Array.isArray(bucket.key)
        ? extractIndexNameFromBackingIndex(bucket.key[0]) // We will keep _index as our first groupBy element by default
        : extractIndexNameFromBackingIndex(bucket.key);
      const key = Array.isArray(bucket.key) ? [dataStream, ...bucket.key.slice(1)] : [dataStream];
      return {
        ...acc,
        [`${dataStream},${bucket.key.slice(1).join(',')}`]: {
          bucketKey: key,
          docCount: (acc[dataStream]?.docCount ?? 0) + bucket.doc_count,
        },
      };
    },
    {} as Record<string, { bucketKey: string[]; docCount: number }>
  );

  return Object.keys(groupedDataStreams).reduce((obj, bucket) => {
    obj[groupedDataStreams[bucket].bucketKey.join(',')] = {
      docCount: groupedDataStreams[bucket].docCount,
      bucketKey: groupedDataStreams[bucket].bucketKey,
    };

    return obj;
  }, {} as Record<string, { bucketKey: string[]; docCount: number }>);
}
