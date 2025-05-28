/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  AggregationsAggregate,
  AggregationsDateHistogramAggregate,
} from '@elastic/elasticsearch/lib/api/types';
import { IScopedClusterClient } from '@kbn/core/server';
import { buildEsQuery } from '@kbn/es-query';
import { ChangePointType } from '@kbn/es-types/src';
import { get, isArray, isEmpty } from 'lodash';
import { AssetClient } from '../../../lib/streams/assets/asset_client';

export type SignificantEventsGetResponse = Array<{
  id: string;
  title: string;
  kql: {
    query: string;
  };
  occurrences: Array<{
    date: string;
    count: number;
  }>;
  change_points: AggregationsAggregate;
}>;

export async function readSignificantEvents(
  params: { name: string; from: Date; to: Date; bucketSize: string },
  dependencies: {
    assetClient: AssetClient;
    scopedClusterClient: IScopedClusterClient;
  }
): Promise<SignificantEventsGetResponse> {
  const { assetClient, scopedClusterClient } = dependencies;
  const { name, from, to, bucketSize } = params;

  const assetQueries = await assetClient.getAssetLinks(name, ['query']);
  if (isEmpty(assetQueries)) {
    return [];
  }

  const searchRequests = assetQueries.flatMap((asset) => {
    return [
      { index: name },
      {
        size: 0,
        query: {
          bool: {
            filter: [
              {
                range: {
                  '@timestamp': {
                    gte: from.toISOString(),
                    lte: to.toISOString(),
                  },
                },
              },
              buildQuery(asset.query.kql.query),
            ],
          },
        },
        aggs: {
          occurrences: {
            date_histogram: {
              field: '@timestamp',
              fixed_interval: bucketSize,
              extended_bounds: {
                min: from.toISOString(),
                max: to.toISOString(),
              },
            },
          },
          change_points: {
            change_point: {
              buckets_path: 'occurrences>_count',
            },
          },
        },
      },
    ];
  });

  const response = await scopedClusterClient.asCurrentUser.msearch<
    unknown,
    {
      occurrences: AggregationsDateHistogramAggregate;
      change_points: {
        type: {
          [key in ChangePointType]: { p_value: number; change_point: number };
        };
      };
    }
  >({ searches: searchRequests });

  const significantEvents = response.responses.map((queryResponse, queryIndex) => {
    const query = assetQueries[queryIndex];
    if ('error' in queryResponse) {
      return {
        id: query.query.id,
        title: query.query.title,
        kql: query.query.kql,
        occurrences: [],
        change_points: {},
      };
    }

    const buckets = get(queryResponse, 'aggregations.occurrences.buckets');
    const changePoints = get(queryResponse, 'aggregations.change_points') ?? {};

    return {
      id: query.query.id,
      title: query.query.title,
      kql: query.query.kql,
      occurrences: isArray(buckets)
        ? buckets.map((bucket) => ({
            date: bucket.key_as_string,
            count: bucket.doc_count,
          }))
        : [],
      change_points: changePoints,
    };
  });

  // changePoints type is not inferred correclty
  return significantEvents as SignificantEventsGetResponse;
}

function buildQuery(kql: string) {
  try {
    return buildEsQuery(
      undefined,
      {
        query: kql,
        language: 'kuery',
      },
      [],
      { allowLeadingWildcards: true }
    );
  } catch (err) {
    return { match_all: {} };
  }
}
