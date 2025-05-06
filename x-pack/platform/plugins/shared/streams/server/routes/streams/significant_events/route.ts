/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  AggregationsDateHistogramAggregate,
  QueryDslQueryContainer,
} from '@elastic/elasticsearch/lib/api/types';
import { badRequest, notFound } from '@hapi/boom';
import { ChangePointType } from '@kbn/es-types/src';
import {
  SignificantEventsGetResponse,
  SignificantEventsPreviewResponse,
  StreamQueryKql,
  streamQueryKqlSchema,
} from '@kbn/streams-schema';
import { createTracedEsClient } from '@kbn/traced-es-client';
import { z } from '@kbn/zod';
import { isEmpty } from 'lodash';
import { STREAMS_API_PRIVILEGES } from '../../../../common/constants';
import { createServerRoute } from '../../create_server_route';

const dateFromString = z.string().pipe(z.coerce.date());

function createSearchRequest({
  from,
  to,
  query,
  bucketSize,
}: {
  from: Date;
  to: Date;
  query: StreamQueryKql;
  bucketSize: string;
}) {
  return {
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
          {
            kql: {
              query: query.kql.query,
            },
          } as QueryDslQueryContainer,
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
      } as {},
    },
  };
}

const previewSignificantEventsRoute = createServerRoute({
  endpoint: 'POST /api/streams/{name}/significant_events/_preview',
  params: z.object({
    path: z.object({ name: z.string() }),
    query: z.object({ from: dateFromString, to: dateFromString, bucketSize: z.string() }),
    body: z.object({
      query: streamQueryKqlSchema,
    }),
  }),

  options: {
    access: 'internal',
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
  handler: async ({
    params,
    request,
    getScopedClients,
    logger,
  }): Promise<SignificantEventsPreviewResponse> => {
    const { streamsClient, scopedClusterClient } = await getScopedClients({
      request,
    });

    const isStreamEnabled = await streamsClient.isStreamsEnabled();
    if (!isStreamEnabled) {
      throw badRequest('Streams is not enabled');
    }

    const tracedEsClient = createTracedEsClient({
      client: scopedClusterClient.asCurrentUser,
      logger,
      plugin: 'streams',
    });

    const { name } = params.path;
    const { from, to, bucketSize } = params.query;
    const { query } = params.body;

    const searchRequest = createSearchRequest({
      bucketSize,
      from,
      query,
      to,
    });

    const response = await tracedEsClient.search('get_significant_event_timeseries', {
      index: name,
      track_total_hits: false,
      ...searchRequest,
    });

    if (!response.aggregations) {
      throw notFound();
    }

    const aggregations = response.aggregations as typeof response.aggregations & {
      change_points: {
        type: Record<ChangePointType, { p_value: number; change_point: number }>;
      };
    };

    return {
      ...query,
      change_points: aggregations.change_points,
      occurrences:
        aggregations.occurrences.buckets.map((bucket) => {
          return {
            date: bucket.key_as_string,
            count: bucket.doc_count,
          };
        }) ?? [],
    };
  },
});

const readSignificantEventsRoute = createServerRoute({
  endpoint: 'GET /api/streams/{name}/significant_events 2023-10-31',
  params: z.object({
    path: z.object({ name: z.string() }),
    query: z.object({
      from: dateFromString,
      to: dateFromString,
      bucketSize: z.string(),
    }),
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
      requiredPrivileges: [STREAMS_API_PRIVILEGES.read],
    },
  },
  handler: async ({ params, request, getScopedClients }): Promise<SignificantEventsGetResponse> => {
    const { streamsClient, assetClient, scopedClusterClient } = await getScopedClients({
      request,
    });

    const isStreamEnabled = await streamsClient.isStreamsEnabled();
    if (!isStreamEnabled) {
      throw badRequest('Streams are not enabled');
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
        createSearchRequest({
          from,
          to,
          bucketSize,
          query: asset.query,
        }),
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

export const significantEventsRoutes = {
  ...readSignificantEventsRoute,
  ...previewSignificantEventsRoute,
};
