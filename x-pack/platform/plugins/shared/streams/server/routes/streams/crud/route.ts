/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SearchTotalHits } from '@elastic/elasticsearch/lib/api/types';
import {
  isGroupStreamDefinition,
  StreamDefinition,
  StreamGetResponse,
  isWiredStreamDefinition,
  streamUpsertRequestSchema,
  isGroupStreamDefinitionBase,
  isUnwiredStreamDefinition,
} from '@kbn/streams-schema';
import { z } from '@kbn/zod';
import { badData, badRequest } from '@hapi/boom';
import { hasSupportedStreamsRoot } from '../../../lib/streams/root_stream_definition';
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

export interface StreamDetailsResponse {
  details: {
    count: number;
  };
}

export const streamDetailRoute = createServerRoute({
  endpoint: 'GET /internal/streams/{name}/_details',
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
  params: z.object({
    path: z.object({ name: z.string() }),
    query: z.object({
      start: z.string(),
      end: z.string(),
    }),
  }),
  handler: async ({ params, request, getScopedClients }): Promise<StreamDetailsResponse> => {
    const { scopedClusterClient, streamsClient } = await getScopedClients({ request });
    const streamEntity = await streamsClient.getStream(params.path.name);

    const indexPattern = isGroupStreamDefinition(streamEntity)
      ? streamEntity.group.members.join(',')
      : streamEntity.name;
    // check doc count
    const docCountResponse = await scopedClusterClient.asCurrentUser.search({
      index: indexPattern,
      track_total_hits: true,
      query: {
        range: {
          '@timestamp': {
            gte: params.query.start,
            lte: params.query.end,
          },
        },
      },
      size: 0,
    });

    const count = (docCountResponse.hits.total as SearchTotalHits).value;

    return {
      details: {
        count,
      },
    };
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
  params: z.object({}),
  handler: async ({ request, getScopedClients }): Promise<{ streams: StreamDefinition[] }> => {
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
  }),
  handler: async ({ params, request, getScopedClients }): Promise<UpsertStreamResponse> => {
    const { streamsClient } = await getScopedClients({ request });
    const streamDefinition = { ...params.body.stream, name: params.path.name };

    if (!isUnwiredStreamDefinition(streamDefinition) && !(await streamsClient.isStreamsEnabled())) {
      throw badData('Streams are not enabled for Wired and Group streams.');
    }

    if (isWiredStreamDefinition(streamDefinition) && !hasSupportedStreamsRoot(params.path.name)) {
      throw badRequest('Cannot create wired stream due to unsupported root stream');
    }

    if (isGroupStreamDefinition(streamDefinition) && params.path.name.startsWith('logs.')) {
      throw badRequest('A group stream name can not start with [logs.]');
    }

    const body = isGroupStreamDefinitionBase(params.body.stream)
      ? {
          ...params.body,
          stream: {
            group: {
              ...params.body.stream.group,
              members: Array.from(new Set(params.body.stream.group.members)),
            },
          },
        }
      : params.body;

    return await streamsClient.upsertStream({
      request: body,
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
      enabled: false,
      reason:
        'This API delegates security to the currently logged in user and their Elasticsearch permissions.',
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
  ...streamDetailRoute,
  ...listStreamsRoute,
  ...editStreamRoute,
  ...deleteStreamRoute,
};
