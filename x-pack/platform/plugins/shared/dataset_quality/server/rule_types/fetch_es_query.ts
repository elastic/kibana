/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { IScopedClusterClient } from '@kbn/core/server';
import { MappingRuntimeField, QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import type { estypes } from '@elastic/elasticsearch';
import {
  DATASET_QUALITY_RULE_RUNTIME_FIELD_MAPPING,
  DATASET_QUALITY_RULE_RUNTIME_FIELD_NAME,
} from '../../common/constants';

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
    runtime_mappings: {
      [DATASET_QUALITY_RULE_RUNTIME_FIELD_NAME]:
        DATASET_QUALITY_RULE_RUNTIME_FIELD_MAPPING as MappingRuntimeField,
    },
    aggs,
  });

  const dataStreamBuckets =
    (esResult.aggregations?.dataStreams?.buckets as estypes.AggregationsStringTermsBucketKeys[]) ||
    [];

  return (
    dataStreamBuckets.map((bucket) => {
      const groupByFields = bucket.key.reduce(
        (obj: Record<string, string>, bucketKey: string, bucketIndex: number) => ({
          ...obj,
          [groupBy[bucketIndex]]: bucketKey,
        }),
        {}
      );

      const bucketKey = bucket.key;

      return {
        docCount: bucket.doc_count,
        groupByFields,
        bucketKey,
      };
    }) ?? []
  );
}
