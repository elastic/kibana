/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { conditionSchema } from '@kbn/streams-schema';
import { z } from '@kbn/zod';
import { STREAMS_API_PRIVILEGES } from '../../../../common/constants';
import { ResyncStreamsResponse } from '../../../lib/streams/client';
import { createServerRoute } from '../../create_server_route';

export const forkStreamsRoute = createServerRoute({
  endpoint: 'POST /api/streams/{name}/_fork 2023-10-31',
  options: {
    access: 'public',
    description: 'Forks a wired stream and creates a child stream',
    summary: 'Fork a stream',
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
    body: z.object({ stream: z.object({ name: z.string() }), if: conditionSchema }),
  }),
  handler: async ({ params, request, getScopedClients }): Promise<{ acknowledged: true }> => {
    const { streamsClient } = await getScopedClients({
      request,
    });

    return await streamsClient.forkStream({
      parent: params.path.name,
      if: params.body.if,
      name: params.body.stream.name,
    });
  },
});

export const resyncStreamsRoute = createServerRoute({
  endpoint: 'POST /api/streams/_resync 2023-10-31',
  options: {
    access: 'public',
    description: 'Resyncs all streams, making sure that Elasticsearch assets are up to date',
    summary: 'Resync streams',
    availability: {
      stability: 'experimental',
    },
  },
  security: {
    authz: {
      requiredPrivileges: [STREAMS_API_PRIVILEGES.manage],
    },
  },
  params: z.object({}),
  handler: async ({ request, getScopedClients }): Promise<ResyncStreamsResponse> => {
    const { streamsClient } = await getScopedClients({ request });

    return await streamsClient.resyncStreams();
  },
});

export const getStreamsStatusRoute = createServerRoute({
  endpoint: 'GET /api/streams/_status',
  options: {
    access: 'internal',
  },
  security: {
    authz: {
      requiredPrivileges: [STREAMS_API_PRIVILEGES.read],
    },
  },
  handler: async ({ request, getScopedClients }): Promise<{ enabled: boolean }> => {
    const { streamsClient } = await getScopedClients({ request });

    return {
      enabled: await streamsClient.isStreamsEnabled(),
    };
  },
});

export const managementRoutes = {
  ...forkStreamsRoute,
  ...resyncStreamsRoute,
  ...getStreamsStatusRoute,
};
