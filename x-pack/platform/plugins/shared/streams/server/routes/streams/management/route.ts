/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { conditionSchema, isNeverCondition } from '@kbn/streamlang';
import { routingStatus } from '@kbn/streams-schema';
import { STREAMS_API_PRIVILEGES } from '../../../../common/constants';
import type { ResyncStreamsResponse } from '../../../lib/streams/client';
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
    body: z.object({
      stream: z.object({ name: z.string() }),
      where: conditionSchema,
      status: routingStatus.optional(),
    }),
  }),
  handler: async ({ params, request, getScopedClients }): Promise<{ acknowledged: true }> => {
    const { streamsClient } = await getScopedClients({
      request,
    });

    const conditionStatus = params.body.status
      ? params.body.status
      : isNeverCondition(params.body.where)
      ? 'disabled'
      : 'enabled';

    return await streamsClient.forkStream({
      parent: params.path.name,
      where: params.body.where,
      name: params.body.stream.name,
      status: conditionStatus,
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
  handler: async ({
    request,
    getScopedClients,
  }): Promise<{ enabled: boolean | 'conflict'; can_manage: boolean }> => {
    const { streamsClient } = await getScopedClients({ request });

    const privileges = await streamsClient.getPrivileges('logs,logs.*');

    return { enabled: await streamsClient.checkStreamStatus(), can_manage: privileges.manage };
  },
});

export const getClassicStreamsStatusRoute = createServerRoute({
  endpoint: 'GET /internal/streams/_classic_status',
  options: {
    access: 'internal',
  },
  security: {
    authz: {
      requiredPrivileges: [STREAMS_API_PRIVILEGES.read],
    },
  },
  handler: async ({ request, getScopedClients }): Promise<{ can_manage: boolean }> => {
    const { scopedClusterClient } = await getScopedClients({ request });

    const REQUIRED_MANAGE_PRIVILEGES = ['manage_index_templates'];

    const privileges = await scopedClusterClient.asCurrentUser.security.hasPrivileges({
      cluster: REQUIRED_MANAGE_PRIVILEGES,
    });

    return { can_manage: privileges.cluster.manage_index_templates === true };
  },
});

export const managementRoutes = {
  ...forkStreamsRoute,
  ...resyncStreamsRoute,
  ...getStreamsStatusRoute,
  ...getClassicStreamsStatusRoute,
};
