/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import type { QueriesGetResponse, QueriesOccurrencesGetResponse } from '@kbn/streams-schema';
import { sortForQueriesTable } from '../../../../lib/significant_events/utils';
import { STREAMS_API_PRIVILEGES } from '../../../../../common/constants';
import { createServerRoute } from '../../../create_server_route';
import { assertSignificantEventsAccess } from '../../../utils/assert_significant_events_access';
import { readSignificantEventsFromAlertsIndices } from '../../../../lib/significant_events/read_significant_events_from_alerts_indices';

const dateFromString = z.string().transform((input) => new Date(input));

const requestParamsSchema = z.object({
  from: dateFromString.describe('Start of the time range'),
  to: dateFromString.describe('End of the time range'),
  bucketSize: z.string().describe('Size of time buckets for aggregation'),
  query: z.string().optional().describe('Query string to filter significant events queries'),
  streamNames: z
    .preprocess((val) => (typeof val === 'string' ? [val] : val), z.array(z.string()).optional())
    .describe('Stream names to filter significant events'),
});

export const getUnbackedQueriesCountRoute = createServerRoute({
  endpoint: 'GET /internal/streams/queries/_unbacked_count',
  options: {
    access: 'internal',
    summary: 'Count unbacked queries across streams',
    description:
      'Returns the count of stored significant-events queries across all streams that do not yet have a backing Kibana rule.',
  },
  security: {
    authz: {
      requiredPrivileges: [STREAMS_API_PRIVILEGES.read],
    },
  },
  params: z.object({}),
  handler: async ({ request, getScopedClients, server }): Promise<{ count: number }> => {
    const { queryClient, licensing, uiSettingsClient } = await getScopedClients({
      request,
    });

    await assertSignificantEventsAccess({ server, licensing, uiSettingsClient });

    const count = await queryClient.getUnbackedQueriesCount();
    return { count };
  },
});

export const promoteUnbackedQueriesRoute = createServerRoute({
  endpoint: 'POST /internal/streams/queries/_promote',
  options: {
    access: 'internal',
    summary: 'Promote unbacked queries',
    description:
      'Creates Kibana rules for stored queries across streams that do not yet have a backing rule, then marks them as backed.',
  },
  security: {
    authz: {
      requiredPrivileges: [STREAMS_API_PRIVILEGES.manage],
    },
  },
  params: z.object({
    body: z
      .object({
        queryIds: z.array(z.string()).optional(),
      })
      .nullish(),
  }),
  handler: async ({
    params,
    request,
    getScopedClients,
    server,
    logger,
  }): Promise<{ promoted: number }> => {
    const { queryClient, streamsClient, licensing, uiSettingsClient } = await getScopedClients({
      request,
    });

    await assertSignificantEventsAccess({ server, licensing, uiSettingsClient });

    const all = await queryClient.getAllUnbackedQueries();
    const requestedQueryIds = params?.body?.queryIds ?? [];

    let toPromote = all;

    if (requestedQueryIds.length > 0) {
      const uniqueRequestedQueryIds = new Set(requestedQueryIds);

      toPromote = all.filter((query) => uniqueRequestedQueryIds.has(query.query.id));
    }

    const byStream = toPromote.reduce<Record<string, string[]>>((acc, link) => {
      const stream = link.stream_name;
      if (!acc[stream]) acc[stream] = [];
      acc[stream].push(link.query.id);
      return acc;
    }, {});

    const streamDefinitions = await streamsClient.listStreams();
    const streamDefinitionsByName = new Map(
      streamDefinitions.map((streamDefinition) => [streamDefinition.name, streamDefinition])
    );

    let promoted = 0;
    for (const [streamName, queryIds] of Object.entries(byStream)) {
      const definition = streamDefinitionsByName.get(streamName);
      if (!definition) {
        logger.warn(`Skipping promotion for missing stream ${streamName}`);
        continue;
      }
      const result = await queryClient.promoteQueries(definition, queryIds);
      promoted += result.promoted;
    }
    return { promoted };
  },
});

const getDiscoveryQueriesRoute = createServerRoute({
  endpoint: 'GET /internal/streams/_queries',
  params: z.object({
    query: requestParamsSchema.extend({
      page: z.coerce.number().int().min(1).optional().describe('Page number (1-based)'),
      perPage: z.coerce
        .number()
        .int()
        .min(1)
        .max(1000)
        .optional()
        .describe('Number of items per page'),
    }),
  }),
  options: {
    access: 'internal',
    summary: 'Read paginated significant-event queries for the discovery table',
    description: 'Returns significant-event queries as table rows, with server-side pagination.',
  },
  security: {
    authz: {
      requiredPrivileges: [STREAMS_API_PRIVILEGES.read],
    },
  },
  handler: async ({ params, request, getScopedClients, server }): Promise<QueriesGetResponse> => {
    const { queryClient, scopedClusterClient, licensing, uiSettingsClient } =
      await getScopedClients({
        request,
      });

    await assertSignificantEventsAccess({ server, licensing, uiSettingsClient });

    const { from, to, bucketSize, query, streamNames, page = 1, perPage = 10 } = params.query;

    const { significant_events: queries } = await readSignificantEventsFromAlertsIndices(
      {
        from,
        to,
        bucketSize,
        query,
        streamNames,
      },
      { queryClient, scopedClusterClient }
    );

    const sortedQueries = sortForQueriesTable(queries);
    const total = queries.length;
    const start = (page - 1) * perPage;
    const queriesPage = start >= total ? [] : sortedQueries.slice(start, start + perPage);

    return { queries: queriesPage, page, perPage, total };
  },
});

const getDiscoveryQueriesOccurrencesRoute = createServerRoute({
  endpoint: 'GET /internal/streams/_queries/_occurrences',
  params: z.object({
    query: requestParamsSchema,
  }),
  options: {
    access: 'internal',
    summary: 'Read aggregated occurrences for the discovery histogram',
    description:
      'Returns the aggregated occurrences histogram series for the chart above the queries table.',
  },
  security: {
    authz: {
      requiredPrivileges: [STREAMS_API_PRIVILEGES.read],
    },
  },
  handler: async ({
    params,
    request,
    getScopedClients,
    server,
  }): Promise<QueriesOccurrencesGetResponse> => {
    const { queryClient, scopedClusterClient, licensing, uiSettingsClient } =
      await getScopedClients({
        request,
      });

    await assertSignificantEventsAccess({ server, licensing, uiSettingsClient });

    const { from, to, bucketSize, query, streamNames } = params.query;

    const { aggregated_occurrences: aggregatedOccurrenceBuckets } =
      await readSignificantEventsFromAlertsIndices(
        {
          from,
          to,
          bucketSize,
          query,
          streamNames,
        },
        { queryClient, scopedClusterClient }
      );

    const occurrencesHistogram = aggregatedOccurrenceBuckets.map((bucket) => ({
      x: bucket.date,
      y: bucket.count,
    }));

    const totalOccurrences = aggregatedOccurrenceBuckets.reduce(
      (sum, bucket) => sum + bucket.count,
      0
    );

    return { occurrences_histogram: occurrencesHistogram, total_occurrences: totalOccurrences };
  },
});

export const internalQueriesRoutes = {
  ...getUnbackedQueriesCountRoute,
  ...promoteUnbackedQueriesRoute,
  ...getDiscoveryQueriesRoute,
  ...getDiscoveryQueriesOccurrencesRoute,
};
