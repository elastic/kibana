/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { badData } from '@hapi/boom';
import { Streams } from '@kbn/streams-schema';
import { STREAMS_API_PRIVILEGES } from '../../../../common/constants';
import { UpsertStreamResponse } from '../../../lib/streams/client';
import { createServerRoute } from '../../create_server_route';
import { readStream } from './read_stream';

export const readStreamRoute = createServerRoute({
  endpoint: 'GET /api/streams/{name} 2023-10-31',
  options: {
    access: 'public',
    summary: 'Get a stream',
    description: 'Fetches a stream definition and associated dashboards',
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
    path: z.object({ name: z.string() }),
  }),
  handler: async ({ params, request, getScopedClients }): Promise<Streams.all.GetResponse> => {
    const { assetClient, streamsClient, scopedClusterClient } = await getScopedClients({
      request,
    });

    const body = await readStream({
      name: params.path.name,
      assetClient,
      scopedClusterClient,
      streamsClient,
    });

    return body;
  },
});

export const listStreamsRoute = createServerRoute({
  endpoint: 'GET /api/streams 2023-10-31',
  options: {
    access: 'public',
    description: 'Fetches list of all streams',
    summary: 'Get stream list',
    availability: {
      stability: 'experimental',
    },
  },
  security: {
    authz: {
      requiredPrivileges: [STREAMS_API_PRIVILEGES.read],
    },
  },
  params: z.object({}),
  handler: async ({
    request,
    getScopedClients,
  }): Promise<{ streams: Streams.all.Definition[] }> => {
    const { streamsClient } = await getScopedClients({ request });
    return {
      streams: await streamsClient.listStreams(),
    };
  },
});

export const editStreamRoute = createServerRoute({
  endpoint: 'PUT /api/streams/{name} 2023-10-31',
  options: {
    access: 'public',
    summary: 'Create or update a stream',
    description:
      'Creates or updates a stream definition. Classic streams can not be created through this API, only updated',
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
    body: Streams.all.UpsertRequest.right,
  }),
  handler: async ({ params, request, getScopedClients }): Promise<UpsertStreamResponse> => {
    const { streamsClient } = await getScopedClients({ request });

    if (
      !Streams.UnwiredStream.UpsertRequest.is(params.body) &&
      !(await streamsClient.isStreamsEnabled())
    ) {
      throw badData('Streams are not enabled for Wired and Group streams.');
    }

    return await streamsClient.upsertStream({
      request: params.body,
      name: params.path.name,
    });
  },
});

export const deleteStreamRoute = createServerRoute({
  endpoint: 'DELETE /api/streams/{name} 2023-10-31',
  options: {
    access: 'public',
    summary: 'Delete a stream',
    description: 'Deletes a stream definition and the underlying data stream',
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
  }),
  handler: async ({ params, request, getScopedClients }): Promise<{ acknowledged: true }> => {
    const { streamsClient } = await getScopedClients({
      request,
    });

    return await streamsClient.deleteStream(params.path.name);
  },
});

export const crudRoutes = {
  ...readStreamRoute,
  ...listStreamsRoute,
  ...editStreamRoute,
  ...deleteStreamRoute,
};
