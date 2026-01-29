/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { STREAMS_API_PRIVILEGES } from '../../../../../common/constants';
import type { QueryLink } from '../../../../../common/queries';
import { createServerRoute } from '../../../create_server_route';
import { assertSignificantEventsAccess } from '../../../utils/assert_significant_events_access';

export const getUnbackedQueriesRoute = createServerRoute({
  endpoint: 'GET /internal/streams/{name}/queries/_unbacked',
  options: {
    access: 'internal',
    summary: 'List unbacked queries for a stream',
    description:
      'Returns all stored significant-events queries for the stream that do not yet have a backing Kibana rule.',
  },
  security: {
    authz: {
      requiredPrivileges: [STREAMS_API_PRIVILEGES.read],
    },
  },
  params: z.object({
    path: z.object({
      name: z.string().describe('The name of the stream'),
    }),
  }),
  handler: async ({
    params,
    request,
    getScopedClients,
    server,
  }): Promise<{ queries: QueryLink[] }> => {
    const { queryClient, licensing, uiSettingsClient } = await getScopedClients({
      request,
    });

    await assertSignificantEventsAccess({ server, licensing, uiSettingsClient });

    const { name: streamName } = params.path;
    const queries = await queryClient.getUnbackedQueries(streamName);

    return { queries };
  },
});

export const promoteUnbackedQueriesRoute = createServerRoute({
  endpoint: 'POST /internal/streams/{name}/queries/_promote',
  options: {
    access: 'internal',
    summary: 'Promote unbacked queries',
    description:
      'Creates Kibana rules for stored queries that do not yet have a backing rule, then marks them as backed.',
  },
  security: {
    authz: {
      requiredPrivileges: [STREAMS_API_PRIVILEGES.manage],
    },
  },
  params: z.object({
    path: z.object({
      name: z.string().describe('The name of the stream'),
    }),
    body: z.object({
      queryIds: z.array(z.string()).describe('Query IDs to promote'),
    }),
  }),
  handler: async ({ params, request, getScopedClients, server }): Promise<{ promoted: number }> => {
    const { queryClient, licensing, uiSettingsClient } = await getScopedClients({
      request,
    });

    await assertSignificantEventsAccess({ server, licensing, uiSettingsClient });

    const { name: streamName } = params.path;
    const { queryIds } = params.body;

    return queryClient.promoteQueries(streamName, queryIds);
  },
});

export const internalQueriesRoutes = {
  ...getUnbackedQueriesRoute,
  ...promoteUnbackedQueriesRoute,
};
