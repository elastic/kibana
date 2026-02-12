/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { STREAMS_API_PRIVILEGES } from '../../../../../common/constants';
import { createServerRoute } from '../../../create_server_route';
import { assertSignificantEventsAccess } from '../../../utils/assert_significant_events_access';

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

export const promoteAllUnbackedQueriesRoute = createServerRoute({
  endpoint: 'POST /internal/streams/queries/_promote_all',
  options: {
    access: 'internal',
    summary: 'Promote all unbacked queries',
    description:
      'Creates Kibana rules for all stored queries across streams that do not yet have a backing rule, then marks them as backed.',
  },
  security: {
    authz: {
      requiredPrivileges: [STREAMS_API_PRIVILEGES.manage],
    },
  },
  params: z.object({}),
  handler: async ({ request, getScopedClients, server }): Promise<{ promoted: number }> => {
    const { queryClient, licensing, uiSettingsClient } = await getScopedClients({
      request,
    });

    await assertSignificantEventsAccess({ server, licensing, uiSettingsClient });

    const all = await queryClient.getAllUnbackedQueries();
    const byStream = all.reduce<Record<string, string[]>>((acc, link) => {
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

export const internalQueriesRoutes = {
  ...getUnbackedQueriesCountRoute,
  ...promoteAllUnbackedQueriesRoute,
};
