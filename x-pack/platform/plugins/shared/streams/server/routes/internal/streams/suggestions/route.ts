/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import type { StreamSuggestion } from '@kbn/streams-ai';
import { STREAMS_API_PRIVILEGES } from '../../../../../common/constants';
import { createServerRoute } from '../../../create_server_route';
import { getStreamSuggestions } from '../../../../lib/streams/suggestions/suggestions';

export interface StreamSuggestionsResponse {
  suggestions: StreamSuggestion[];
}

const readStreamSuggestionsRoute = createServerRoute({
  endpoint: 'POST /internal/streams/{name}/_suggestions',
  options: {
    access: 'internal',
  },
  security: {
    authz: {
      requiredPrivileges: [STREAMS_API_PRIVILEGES.read],
    },
  },
  params: z.object({
    path: z.object({ name: z.string() }),
    body: z.object({
      connector_id: z.string(),
      start: z.number(),
      end: z.number(),
    }),
  }),
  handler: async ({
    params,
    request,
    getScopedClients,
    server,
    logger,
  }): Promise<StreamSuggestionsResponse> => {
    const { streamsClient, scopedClusterClient, inferenceClient } = await getScopedClients({
      request,
    });

    const { name } = params.path;
    const { connector_id: connectorId, start, end } = params.body;

    const definition = await streamsClient.getStream(name);

    const suggestions = await getStreamSuggestions(definition, {
      esClient: scopedClusterClient.asCurrentUser,
      esClientAsSecondaryAuthUser: scopedClusterClient.asSecondaryAuthUser,
      isServerless: server.isServerless,
      inferenceClient: inferenceClient.bindTo({ connectorId }),
      start,
      end,
      logger,
    });

    return { suggestions };
  },
});

export const internalStreamSuggestionsRoutes = {
  ...readStreamSuggestionsRoute,
};
