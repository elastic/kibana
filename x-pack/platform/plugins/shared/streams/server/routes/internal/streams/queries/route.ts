/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import type { QueriesGetResponse, QueriesOccurrencesGetResponse } from '@kbn/streams-schema';
import { orderBy } from 'lodash';
import {
  streamQueryCategorySchema,
  streamQuerySourceSchema,
  streamQueryTypeSchema,
} from '@kbn/streams-schema';
import { STREAMS_API_PRIVILEGES } from '../../../../../common/constants';
import { createServerRoute } from '../../../create_server_route';
import { assertSignificantEventsAccess } from '../../../utils/assert_significant_events_access';
import { queryStatusSchema, toRuleUnbackedFilter } from '../../../utils/query_status';

const dateFromString = z.string().transform((input) => new Date(input));

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

    const all = await queryClient.getQueryLinks([], { ruleUnbacked: 'include' });
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

const getQueriesRoute = createServerRoute({
  endpoint: 'GET /internal/streams/_queries',
  params: z.object({
    query: z.object({
      search: z.string().optional().describe('Query string to filter significant events queries'),
      streamName: z
        .preprocess((val) => (typeof val === 'string' ? [val] : val), z.array(z.string()))
        .optional()
        .describe('Stream names to filter significant events'),
      type: z
        .preprocess(
          (val) => (typeof val === 'string' ? [val] : val),
          z.array(streamQueryTypeSchema)
        )
        .optional()
        .describe('Query types to filter by'),
      category: z
        .preprocess(
          (val) => (typeof val === 'string' ? [val] : val),
          z.array(streamQueryCategorySchema)
        )
        .optional()
        .describe('Query categories to filter by'),
      source: z
        .preprocess(
          (val) => (typeof val === 'string' ? [val] : val),
          z.array(streamQuerySourceSchema)
        )
        .optional()
        .describe('Query sources to filter by'),
      page: z.coerce.number().int().min(1).optional().describe('Page number (1-based)'),
      perPage: z.coerce
        .number()
        .int()
        .min(1)
        .max(1000)
        .optional()
        .describe('Number of items per page'),
      status: queryStatusSchema,
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
    const { queryClient, licensing, uiSettingsClient } = await getScopedClients({
      request,
    });

    await assertSignificantEventsAccess({ server, licensing, uiSettingsClient });

    const {
      search,
      streamName,
      type,
      category,
      source,
      page = 1,
      perPage = 10,
      status,
    } = params.query;

    const [queries, unbackedQueryLinks] = await Promise.all([
      queryClient.getQueries({
        streamName,
        type,
        category,
        source,
        search: search?.trim(),
        ruleUnbacked: toRuleUnbackedFilter(status),
      }),
      queryClient.getQueryLinks(streamName ?? [], { ruleUnbacked: 'only' }),
    ]);

    const sortedQueries = orderBy(
      queries,
      [(query) => query.severity_score ?? 0, (query) => query.title],
      ['desc', 'asc']
    );
    const total = queries.length;
    const start = (page - 1) * perPage;
    const queriesPage = start >= total ? [] : sortedQueries.slice(start, start + perPage);
    const filteredQueryIds = new Set(queries.map((query) => query.id));
    const unbacked = Array.from(
      new Set(
        unbackedQueryLinks
          .filter((queryLink) => filteredQueryIds.has(queryLink.query.id))
          .map((queryLink) => queryLink.query.id)
      )
    );

    return { queries: queriesPage, unbacked, page, perPage, total };
  },
});

const getQueriesOccurrencesRoute = createServerRoute({
  endpoint: 'GET /internal/streams/_queries/_occurrences_histogram',
  params: z.object({
    query: z.object({
      from: dateFromString.describe('Start of the time range'),
      to: dateFromString.describe('End of the time range'),
      bucketSize: z.string().describe('Size of time buckets for aggregation'),
      search: z.string().optional().describe('Query string to filter significant events queries'),
      streamName: z
        .preprocess((val) => (typeof val === 'string' ? [val] : val), z.array(z.string()))
        .optional()
        .describe('Stream names to filter significant events'),
      type: z
        .preprocess(
          (val) => (typeof val === 'string' ? [val] : val),
          z.array(streamQueryTypeSchema)
        )
        .optional()
        .describe('Query types to filter by'),
      category: z
        .preprocess(
          (val) => (typeof val === 'string' ? [val] : val),
          z.array(streamQueryCategorySchema)
        )
        .optional()
        .describe('Query categories to filter by'),
      source: z
        .preprocess(
          (val) => (typeof val === 'string' ? [val] : val),
          z.array(streamQuerySourceSchema)
        )
        .optional()
        .describe('Query sources to filter by'),
    }),
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
    const { queryClient, licensing, uiSettingsClient } = await getScopedClients({
      request,
    });

    await assertSignificantEventsAccess({ server, licensing, uiSettingsClient });

    const { from, to, bucketSize, search, streamName, type, category, source } = params.query;

    const queries = await queryClient.getQueries({
      streamName,
      type,
      category,
      source,
      search: search?.trim(),
    });

    return await queryClient.getQueryRuleOccurrences({
      from,
      to,
      bucketSize,
      filter: { queryId: queries.map((query) => query.id) },
    });
  },
});

const getQueryOccurrencesRoute = createServerRoute({
  endpoint: 'GET /internal/streams/_queries/{queryId}/_occurrences_histogram',
  params: z.object({
    path: z.object({
      queryId: z.string(),
    }),
    query: z.object({
      from: dateFromString.describe('Start of the time range'),
      to: dateFromString.describe('End of the time range'),
      bucketSize: z.string().describe('Size of time buckets for aggregation'),
    }),
  }),
  options: {
    access: 'internal',
    summary: 'Read occurrences for a single query',
    description: 'Returns occurrences histogram for a single query across the selected time range.',
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
    const { queryClient, licensing, uiSettingsClient } = await getScopedClients({
      request,
    });

    await assertSignificantEventsAccess({ server, licensing, uiSettingsClient });

    const { queryId } = params.path;
    const { from, to, bucketSize } = params.query;

    return queryClient.getQueryRuleOccurrences({
      from,
      to,
      bucketSize,
      filter: { queryId },
    });
  },
});

export const internalQueriesRoutes = {
  ...getUnbackedQueriesCountRoute,
  ...promoteUnbackedQueriesRoute,
  ...getQueriesRoute,
  ...getQueriesOccurrencesRoute,
  ...getQueryOccurrencesRoute,
};
