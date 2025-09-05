/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { getFailureStoreStats } from '../../../lib/streams/stream_crud';
import { STREAMS_API_PRIVILEGES } from '../../../../common/constants';
import { createServerRoute } from '../../create_server_route';
import { SecurityError } from '../../../lib/streams/errors/security_error';

export interface UpdateFailureStoreResponse {
  acknowledged: true;
}

export const getFailureStoreStatsRoute = createServerRoute({
  endpoint: 'GET /api/streams/{name}/failure_store/stats 2023-10-31',
  options: {
    access: 'public',
    summary: 'Get failure store stats',
    description: 'Gets the failure store statistics for a stream',
    availability: {
      stability: 'experimental',
    },
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
  handler: async ({ params, request, getScopedClients }) => {
    const { scopedClusterClient } = await getScopedClients({
      request,
    });

    const { name } = params.path;

    const stats = await getFailureStoreStats({
      name,
      scopedClusterClient,
    });

    return stats;
  },
});

export const updateFailureStoreRoute = createServerRoute({
  endpoint: 'PUT /api/streams/{name}/_failure_store 2023-10-31',
  options: {
    access: 'public',
    summary: 'Update failure store configuration',
    description: 'Updates the failure store configuration for a stream',
    availability: {
      stability: 'experimental',
    },
  },
  security: {
    authz: {
      requiredPrivileges: [STREAMS_API_PRIVILEGES.manage],
    },
  },
  params: z.object({
    path: z.object({
      name: z.string(),
    }),
    body: z.object({
      failureStoreEnabled: z.boolean(),
      customRetentionPeriod: z.optional(z.string()),
    }),
  }),
  handler: async ({ params, request, getScopedClients }): Promise<UpdateFailureStoreResponse> => {
    const { streamsClient } = await getScopedClients({
      request,
    });

    const { name } = params.path;
    const { failureStoreEnabled, customRetentionPeriod } = params.body;

    // Check if user has failure store read privileges
    const privileges = await streamsClient.getPrivileges(name);
    if (!privileges.manage_failure_store) {
      throw new SecurityError('Insufficient privileges to update failure store configuration');
    }

    await streamsClient.updateFailureStore({
      name,
      enabled: failureStoreEnabled,
      customRetentionPeriod,
    });

    return { acknowledged: true };
  },
});

export const failureStoreRoutes = {
  ...getFailureStoreStatsRoute,
  ...updateFailureStoreRoute,
};
