/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AggregationsDateHistogramAggregate } from '@elastic/elasticsearch/lib/api/types';
import { badRequest } from '@hapi/boom';
import { buildEsQuery } from '@kbn/es-query';
import { SignificantEventsGetResponse } from '@kbn/streams-schema';
import { z } from '@kbn/zod';
import { isEmpty } from 'lodash';
import { createServerRoute } from '../../create_server_route';

const stringToDate = z.string().transform((arg) => new Date(arg));

export const readSignificantEventsRoute = createServerRoute({
  endpoint: 'GET /api/streams/{name}/significant_events 2023-10-31',
  params: z.object({
    path: z.object({ name: z.string() }),
    query: z.object({ from: stringToDate, to: stringToDate, bucketSize: z.string() }),
  }),

  options: {
    access: 'public',
    summary: 'Read the significant events',
    description: 'Read the significant events',
    availability: {
      stability: 'experimental',
    },
  },
  security: {
    authz: {
      enabled: false,
      reason:
        'This API delegates security to the currently logged in user and their Elasticsearch permissions.',
    },
  },
  handler: async ({ params, request, getScopedClients }): Promise<SignificantEventsGetResponse> => {
    const { streamsClient, assetClient, scopedClusterClient } = await getScopedClients({
      request,
    });

    const isStreamEnabled = await streamsClient.isStreamsEnabled();
    if (!isStreamEnabled) {
      throw badRequest('Streams is not enabled');
    }

    const { name } = params.path;
    const { from, to, bucketSize } = params.query;

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
      { occurrences: AggregationsDateHistogramAggregate; change_points: unknown }
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

      return {
        id: query.query.id,
        title: query.query.title,
        kql: query.query.kql,
        occurrences:
          // @ts-ignore map unrecognized on buckets
          queryResponse?.aggregations?.occurrences?.buckets.map((bucket) => ({
            date: bucket.key_as_string,
            count: bucket.doc_count,
          })),
        change_points: queryResponse?.aggregations?.change_points,
      };
    });

    // @ts-ignore
    return significantEvents;
  },
});

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

export const significantEventsRoutes = {
  ...readSignificantEventsRoute,
};
