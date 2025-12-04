/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import {
  getClusterDefaultFailureStoreRetentionValue,
  getFailureStoreStats,
} from '../../../../lib/streams/stream_crud';
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

    const privileges = await streamsClient.getPrivileges(name);

    if (!privileges.manage_failure_store) {
      return { stats: null };
    }

    const stats = await getFailureStoreStats({
      name,
      scopedClusterClient,
      isServerless: server.isServerless,
    });

    return { stats };
  },
});

export const getFailureStoreDefaultRetentionRoute = createServerRoute({
  endpoint: 'GET /internal/streams/failure_store/default_retention',
  options: {
    access: 'internal',
    summary: 'Get failure store default retention',
    description: 'Gets the default retention period for the failure store',
  },
  security: {
    authz: {
      requiredPrivileges: [STREAMS_API_PRIVILEGES.read],
    },
  },
  handler: async ({ request, getScopedClients, server }) => {
    const { scopedClusterClient } = await getScopedClients({
      request,
    });

    const defaultRetention = await getClusterDefaultFailureStoreRetentionValue({
      scopedClusterClient,
      isServerless: !!server.isServerless,
    });

    return { default_retention: defaultRetention };
  },
});

export const failureStoreRoutes = {
  ...getFailureStoreStatsRoute,
  ...getFailureStoreDefaultRetentionRoute,
};
