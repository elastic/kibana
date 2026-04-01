/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import type { StreamSuggestion } from '@kbn/streams-ai';
import { map, catchError } from 'rxjs';
import type { ServerSentEventBase } from '@kbn/sse-utils';
import { createSSEInternalError } from '@kbn/sse-utils';
import type { Observable } from 'rxjs';
import { STREAMS_API_PRIVILEGES } from '../../../../../common/constants';
import { createServerRoute } from '../../../create_server_route';
import { getStreamSuggestions } from '../../../../lib/streams/suggestions/suggestions';
import { getRequestAbortSignal } from '../../../utils/get_request_abort_signal';

// Wrap `suggestion` to avoid the `type` field collision with SSE's own `type` discriminant.
// `null` signals that a type slot resolved with no applicable suggestion.
type StreamSuggestionEvent = ServerSentEventBase<
  'stream_suggestion',
  { suggestion: StreamSuggestion | null }
>;

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
  }): Promise<Observable<StreamSuggestionEvent>> => {
    const { streamsClient, scopedClusterClient, inferenceClient } = await getScopedClients({
      request,
    });

    const { name } = params.path;
    const { connector_id: connectorId, start, end } = params.body;

    const definition = await streamsClient.getStream(name);

    const suggestions$ = getStreamSuggestions(definition, {
      esClient: scopedClusterClient.asCurrentUser,
      esClientAsSecondaryAuthUser: scopedClusterClient.asSecondaryAuthUser,
      isServerless: server.isServerless,
      inferenceClient: inferenceClient.bindTo({ connectorId }),
      start,
      end,
      signal: getRequestAbortSignal(request),
      logger,
    });

    return suggestions$.pipe(
      map(
        (suggestion): StreamSuggestionEvent => ({
          type: 'stream_suggestion' as const,
          suggestion,
        })
      ),
      catchError((err) => {
        const message = err?.message ?? 'Failed to generate suggestions';
        logger.error(`Suggestions stream error for "${name}": ${message}`);
        throw createSSEInternalError(message);
      })
    );
  },
});

export const internalStreamSuggestionsRoutes = {
  ...readStreamSuggestionsRoute,
};
