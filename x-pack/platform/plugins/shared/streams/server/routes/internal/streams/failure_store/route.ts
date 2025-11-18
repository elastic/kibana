/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { Streams } from '@kbn/streams-schema';
import {
  getFailureStore,
  getFailureStoreStats,
  updateFailureStore,
} from '../../../../lib/streams/stream_crud';
import { STREAMS_API_PRIVILEGES } from '../../../../../common/constants';
import { createServerRoute } from '../../../create_server_route';
import { SecurityError } from '../../../../lib/streams/errors/security_error';
import { StatusError } from '../../../../lib/streams/errors/status_error';

export interface UpdateFailureStoreResponse {
  acknowledged: true;
}

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

export const updateFailureStoreRoute = createServerRoute({
  endpoint: 'PUT /internal/streams/{name}/_failure_store',
  options: {
    access: 'internal',
    summary: 'Update failure store configuration',
    description: 'Updates the failure store configuration for a stream',
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
  handler: async ({
    params,
    request,
    getScopedClients,
    server,
  }): Promise<UpdateFailureStoreResponse> => {
    const { streamsClient, scopedClusterClient } = await getScopedClients({
      request,
    });

    const { name } = params.path;
    const { failureStoreEnabled, customRetentionPeriod } = params.body;

    const stream = await streamsClient.getStream(name);

    if (Streams.WiredStream.Definition.is(stream)) {
      throw new StatusError('Only wired streams can be exported', 400);
    }

    // Check if user has failure store manage privileges
    const privileges = await streamsClient.getPrivileges(name);
    if (!privileges.manage_failure_store) {
      throw new SecurityError('Insufficient privileges to update failure store configuration');
    }

    await updateFailureStore({
      name,
      enabled: failureStoreEnabled,
      customRetentionPeriod,
      scopedClusterClient,
      isServerless: server.isServerless,
    });

    return { acknowledged: true };
  },
});

export const failureStoreRoutes = {
  ...getFailureStoreStatsRoute,
  ...updateFailureStoreRoute,
};
