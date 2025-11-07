/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { getFailureStore, getFailureStoreStats } from '../../../../lib/streams/stream_crud';
import { STREAMS_API_PRIVILEGES } from '../../../../../common/constants';
import { createServerRoute } from '../../../create_server_route';

export const getFailureStoreStatsRoute = createServerRoute({
  endpoint: 'GET /internal/streams/{name}/failure_store/stats',
  options: {
    access: 'internal',
    summary: 'Get failure store stats',
    description: 'Gets the failure store statistics for a stream',
  },
  security: {
    authz: {
      requiredPrivileges: [STREAMS_API_PRIVILEGES.read],
    },
  },
  params: z.object({
    path: z.object({
      name: z.string(),
    }),
  }),
  handler: async ({ params, request, getScopedClients, server }) => {
    const { scopedClusterClient, streamsClient } = await getScopedClients({
      request,
    });

    const { name } = params.path;

    const [privileges, failureStore] = await Promise.all([
      streamsClient.getPrivileges(name),
      getFailureStore({
        name,
        scopedClusterClient,
        isServerless: server.isServerless,
      }),
    ]);

    if (!failureStore.enabled || !privileges.manage_failure_store) {
      return { config: failureStore, stats: null };
    }

    const stats = await getFailureStoreStats({
      name,
      scopedClusterClient,
      isServerless: server.isServerless,
    });

    return { config: failureStore, stats };
  },
});

export const failureStoreRoutes = {
  ...getFailureStoreStatsRoute,
};
