/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  StreamDefinition,
  StreamGetResponse,
  streamUpsertRequestSchema,
  isUnwiredStreamDefinition,
} from '@kbn/streams-schema';
import { z } from '@kbn/zod';
import { badData } from '@hapi/boom';
import { mapSettledResponses } from '@kbn/cck-plugin/common';
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
      enabled: false,
      reason:
        'This API delegates security to the currently logged in user and their Elasticsearch permissions.',
    },
  },
  params: z.object({
    path: z.object({ name: z.string() }),
  }),
  handler: async ({ params, request, getScopedClients }): Promise<StreamGetResponse> => {
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

export const readRemoteStreamRoute = createServerRoute({
  endpoint: 'GET /api/streams/{name}/_remote 2023-10-31',
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
      enabled: false,
      reason:
        'This API delegates security to the currently logged in user and their Elasticsearch permissions.',
    },
  },
  params: z.object({
    path: z.object({ name: z.string() }),
  }),
  handler: async ({
    params,
    request,
    getScopedClients,
  }): Promise<Record<string, StreamGetResponse | { error: any }>> => {
    const { cckClientGetter } = await getScopedClients({
      request,
    });

    const responses = await cckClientGetter().request<StreamGetResponse>(
      'GET',
      `/api/streams/${params.path.name}`
    );
    return Object.fromEntries(
      mapSettledResponses(
        responses,
        (response, server) => {
          return [server, response];
        },
        (error, server) => {
          return [server, { error } as any];
        }
      )
    );
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
      enabled: false,
      reason:
        'This API delegates security to the currently logged in user and their Elasticsearch permissions.',
    },
  },
  params: z.object({
    query: z.object({
      server: z.string().optional(),
    }),
  }),
  handler: async ({
    request,
    params,
    getScopedClients,
  }): Promise<{ streams: StreamDefinition[] }> => {
    const { streamsClient, cckClientGetter } = await getScopedClients({ request });
    const server = params.query.server;

    if (server && server !== '_local') {
      const response = (
        await cckClientGetter([server]).request<{ streams: StreamDefinition[] }>(
          'GET',
          '/api/streams'
        )
      )[0];
      if (response.status === 'rejected') {
        throw response;
      }
      return response.value.data;
    }

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
      enabled: false,
      reason:
        'This API delegates security to the currently logged in user and their Elasticsearch permissions.',
    },
  },
  params: z.object({
    path: z.object({
      name: z.string(),
    }),
    body: streamUpsertRequestSchema,
    query: z.object({
      server: z.string().optional(),
    }),
  }),
  handler: async ({ params, request, getScopedClients }): Promise<UpsertStreamResponse> => {
    const server = params.query.server;
    const { streamsClient, cckClientGetter } = await getScopedClients({ request });

    if (!server || server === '_local') {
      const streamDefinition = { ...params.body.stream, name: params.path.name };

      if (
        !isUnwiredStreamDefinition(streamDefinition) &&
        !(await streamsClient.isStreamsEnabled())
      ) {
        throw badData('Streams are not enabled for Wired and Group streams.');
      }

      return await streamsClient.upsertStream({
        request: params.body,
        name: params.path.name,
      });
    }

    const response = (
      await cckClientGetter([server]).request<UpsertStreamResponse>(
        'PUT',
        `/api/streams/${params.path.name}`,
        params.body
      )
    )[0];
    if (response.status === 'rejected') {
      throw response;
    }
    return response.value.data;
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
      enabled: false,
      reason:
        'This API delegates security to the currently logged in user and their Elasticsearch permissions.',
    },
  },
  params: z.object({
    path: z.object({
      name: z.string(),
    }),
    query: z.object({
      server: z.string().optional(),
    }),
  }),
  handler: async ({ params, request, getScopedClients }): Promise<{ acknowledged: true }> => {
    const { streamsClient, cckClientGetter } = await getScopedClients({
      request,
    });

    const server = params.query.server;
    if (!server || server === '_local') {
      return await streamsClient.deleteStream(params.path.name);
    }
    const response = (
      await cckClientGetter([server]).request<{ acknowledged: true }>(
        'DELETE',
        `/api/streams/${params.path.name}`
      )
    )[0];
    if (response.status === 'rejected') {
      throw response;
    }
    if (response.value.status !== 200) {
      throw badData(
        `Failed to delete stream ${params.path.name} on server ${server}: ${response.value.statusText}`
      );
    }
    return response.value.data;
  },
});

export const crudRoutes = {
  ...readStreamRoute,
  ...readRemoteStreamRoute,
  ...listStreamsRoute,
  ...editStreamRoute,
  ...deleteStreamRoute,
};
