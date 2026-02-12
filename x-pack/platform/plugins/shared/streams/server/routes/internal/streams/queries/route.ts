/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import type { SignificantEventsGetResponse } from '@kbn/streams-schema';
import { STREAMS_API_PRIVILEGES } from '../../../../../common/constants';
import { createServerRoute } from '../../../create_server_route';
import { assertSignificantEventsAccess } from '../../../utils/assert_significant_events_access';
import { readSignificantEventsFromAlertsIndices } from '../../../../lib/significant_events/read_significant_events_from_alerts_indices';

// Make sure strings are expected for input, but still converted to a
// Date, without breaking the OpenAPI generator
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
  handler: async ({ params, request, getScopedClients, server }): Promise<{ promoted: number }> => {
    const { queryClient, licensing, uiSettingsClient } = await getScopedClients({
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

    let promoted = 0;
    for (const [streamName, queryIds] of Object.entries(byStream)) {
      const result = await queryClient.promoteQueries(streamName, queryIds);
      promoted += result.promoted;
    }
    return { promoted };
  },
});

const readAllSignificantEventsRoute = createServerRoute({
  endpoint: 'GET /internal/streams/_significant_events',
  params: z.object({
    query: z.object({
      from: dateFromString.describe('Start of the time range'),
      to: dateFromString.describe('End of the time range'),
      bucketSize: z.string().describe('Size of time buckets for aggregation'),
      query: z.string().optional().describe('Query string to filter significant events queries'),
      streamNames: z
        .preprocess(
          (val) => (typeof val === 'string' ? [val] : val),
          z.array(z.string()).optional()
        )
        .describe('Stream names to filter significant events'),
    }),
  }),
  options: {
    access: 'internal',
    summary: 'Read all significant events',
    description: 'Read all significant events',
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
  }): Promise<SignificantEventsGetResponse> => {
    const { queryClient, scopedClusterClient, licensing, uiSettingsClient } =
      await getScopedClients({
        request,
      });
    await assertSignificantEventsAccess({ server, licensing, uiSettingsClient });

    const { from, to, bucketSize, query, streamNames } = params.query;

    return readSignificantEventsFromAlertsIndices(
      {
        from,
        to,
        bucketSize,
        query,
        streamNames,
      },
      { queryClient, scopedClusterClient }
    );
  },
});

export const internalQueriesRoutes = {
  ...getUnbackedQueriesCountRoute,
  ...promoteUnbackedQueriesRoute,
  ...readAllSignificantEventsRoute,
};
