/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { conditionSchema } from '@kbn/streams-schema';
import { z } from '@kbn/zod';
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
      enabled: false,
      reason:
        'This API delegates security to the currently logged in user and their Elasticsearch permissions.',
    },
  },
  params: z.object({
    path: z.object({
      name: z.string(),
    }),
    body: z.object({
      stream: z.object({ name: z.string() }),
      if: conditionSchema,
      server: z.string(),
    }),
  }),
  handler: async ({ params, request, getScopedClients }): Promise<{ acknowledged: true }> => {
    const { streamsClient, cckClientGetter } = await getScopedClients({
      request,
    });

    const server = params.body.server;

    if (server === '_local') {
      return await streamsClient.forkStream({
        parent: params.path.name,
        if: params.body.if,
        name: params.body.stream.name,
      });
    }

    const cckClient = cckClientGetter([server]);

    const response = (
      await cckClient.request<{ acknowledged: true }>(
        'POST',
        `/api/streams/${params.path.name}/_fork`,
        {
          stream: params.body.stream,
          if: params.body.if,
        }
      )
    )[0];
    if (response.status === 'rejected') {
      throw response.reason;
    }
    return response.value.data;
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
      enabled: false,
      reason:
        'This API delegates security to the currently logged in user and their Elasticsearch permissions.',
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
      enabled: false,
      reason:
        'This API delegates security to the currently logged in user and their Elasticsearch permissions.',
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
