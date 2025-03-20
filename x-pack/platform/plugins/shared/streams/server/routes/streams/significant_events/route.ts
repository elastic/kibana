/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { badRequest } from '@hapi/boom';
import { z } from '@kbn/zod';
import { buildEsQuery } from '@kbn/es-query';
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
  handler: async ({ params, request, getScopedClients }): Promise<any> => {
    const { streamsClient, assetClient, scopedClusterClient } = await getScopedClients({
      request,
    });

    const isStreamEnabled = await streamsClient.isStreamsEnabled();
    if (!isStreamEnabled) {
      throw badRequest('Streams is not enabled');
    }

    const { name } = params.path;
    const { from, to, bucketSize } = params.query;

    const assetLinks = await assetClient.getAssetLinks(name, ['query']);

    const searchRequests = assetLinks.flatMap((asset) => {
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
                buildEsQuery(
                  undefined,
                  {
                    query: asset.query.kql.query,
                    language: 'kuery',
                  },
                  [],
                  { allowLeadingWildcards: true }
                ),
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
          },
        },
      ];
    });

    const response = await scopedClusterClient.asCurrentUser.msearch({ searches: searchRequests });

    const significantEvents = response.responses.map((queryResponse, queryIndex) => {
      const query = assetLinks[queryIndex];

      return {
        id: query.query.id,
        name: query.query.title,
        kql: query.query.kql,
        occurrences: queryResponse?.aggregations?.occurrences.buckets ?? [],
      };
    });

    return significantEvents;
  },
});

export const significantEventsRoutes = {
  ...readSignificantEventsRoute,
};
