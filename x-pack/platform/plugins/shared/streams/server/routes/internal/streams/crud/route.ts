/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SearchTotalHits } from '@elastic/elasticsearch/lib/api/types';
import { StreamDefinition, isGroupStreamDefinition } from '@kbn/streams-schema';
import { z } from '@kbn/zod';
import { createServerRoute } from '../../../create_server_route';

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

export const resolveIndexRoute = createServerRoute({
  endpoint: 'GET /internal/streams/_resolve_index',
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
    query: z.object({
      index: z.string(),
    }),
  }),
  handler: async ({
    request,
    params,
    getScopedClients,
  }): Promise<{ stream?: StreamDefinition }> => {
    const { scopedClusterClient, streamsClient } = await getScopedClients({ request });
    const response = (
      await scopedClusterClient.asCurrentUser.indices.get({ index: params.query.index })
    )[params.query.index];
    const dataStream = response.data_stream;
    if (!dataStream) {
      return {};
    }
    const stream = await streamsClient.getStream(dataStream);
    return { stream };
  },
});

export const internalCrudRoutes = {
  ...streamDetailRoute,
  ...resolveIndexRoute,
};
