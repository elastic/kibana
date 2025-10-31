/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { STREAMS_API_PRIVILEGES } from '../../../../../common/constants';
import { createServerRoute } from '../../../create_server_route';
import {
  META_LAYER_INDEX,
  ensureMetaLayerIndex,
  getSearchQuery,
  getSemanticSearchStreamDocument,
} from './semantic_search_params';

const indexStreamsForSemanticSearchRoute = createServerRoute({
  endpoint: 'PUT /internal/streams/index',
  params: z.object({
    query: z.object({ connectorId: z.string() }),
  }),
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
    params,
  }): Promise<{ success: boolean; indexedCount: number }> => {
    const { streamsClient, scopedClusterClient, inferenceClient } = await getScopedClients({
      request,
    });
    const esClient = scopedClusterClient.asCurrentUser;

    try {
      await ensureMetaLayerIndex(esClient);
      const streams = (await streamsClient.listStreamsWithDataStreamExistence()).flatMap(
        ({ exists, stream }) => {
          if (exists) {
            return [stream];
          }
          return [];
        }
      );

      const boundInferenceClient = inferenceClient.bindTo({
        connectorId: params.query.connectorId,
      });

      if (streams.length > 0) {
        const bulkBody = (
          await Promise.all(
            streams.map(async (stream) => {
              const semanticSearchStreamDocument = await getSemanticSearchStreamDocument({
                stream,
                esClient,
                inferenceClient: boundInferenceClient,
              });

              return [{ index: { _index: META_LAYER_INDEX } }, semanticSearchStreamDocument];
            })
          )
        ).flat();

        await esClient.bulk({
          operations: bulkBody,
        });
      }

      return { success: true, indexedCount: streams.length };
    } catch (error) {
      throw new Error(`Failed to index streams for semantic search: ${error.message}`);
    }
  },
});

const semanticSearchStreamsRoute = createServerRoute({
  endpoint: 'POST /internal/streams/semantic-search',
  options: {
    access: 'internal',
  },
  params: z.object({
    body: z.object({
      query: z.string(),
    }),
  }),
  security: {
    authz: {
      requiredPrivileges: [STREAMS_API_PRIVILEGES.read],
    },
  },
  handler: async ({ request, getScopedClients, params }) => {
    const { scopedClusterClient } = await getScopedClients({ request });

    try {
      const searchResponse = await scopedClusterClient.asCurrentUser.search<{ name: string }>({
        index: META_LAYER_INDEX,
        _source: ['name'],
        size: 20,
        query: getSearchQuery(params.body.query),
        min_score: 1,
      });

      const streams = searchResponse.hits.hits.flatMap((hit) => ({
        name: hit._source?.name,
        score: hit._score,
      }));

      return { streams };
    } catch (error) {
      throw new Error(`Failed to perform semantic search: ${error.message}`);
    }
  },
});

export const internalSemanticSearchRoutes = {
  ...indexStreamsForSemanticSearchRoute,
  ...semanticSearchStreamsRoute,
};
