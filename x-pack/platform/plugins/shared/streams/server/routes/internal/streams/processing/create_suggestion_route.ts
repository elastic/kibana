/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IScopedClusterClient } from '@kbn/core/server';
import type { InferenceClient } from '@kbn/inference-common';
import type { IFieldsMetadataClient } from '@kbn/fields-metadata-plugin/server/services/fields_metadata/types';
import type { Observable } from 'rxjs';
import { from, map } from 'rxjs';
import type { RouteParamsRT } from '@kbn/server-route-repository-utils';
import { STREAMS_API_PRIVILEGES, STREAMS_TIERED_ML_FEATURE } from '../../../../../common/constants';
import { SecurityError } from '../../../../lib/streams/errors/security_error';
import type { StreamsClient } from '../../../../lib/streams/client';
import { createServerRoute } from '../../../create_server_route';
import { getRequestAbortSignal } from '../../../utils/get_request_abort_signal';

export interface SuggestionHandlerDeps {
  params: any;
  inferenceClient: InferenceClient;
  scopedClusterClient: IScopedClusterClient;
  streamsClient: StreamsClient;
  fieldsMetadataClient: IFieldsMetadataClient;
  signal: AbortSignal;
}

export interface CreateSuggestionRouteConfig<TParams, THandler, TEndpoint extends string> {
  endpoint: TEndpoint;
  schema: RouteParamsRT;
  handler: (deps: SuggestionHandlerDeps) => Promise<THandler>;
  eventType: string;
}

/**
 * Factory function to create pattern suggestion routes (grok, dissect, etc.)
 * Extracts common route setup including pricing tier checks, client initialization,
 * and SSE response wrapping.
 */
export function createSuggestionRoute<TParams, THandler, TEndpoint extends string>(
  config: CreateSuggestionRouteConfig<TParams, THandler, TEndpoint>
) {
  type SuggestionResponse = Observable<{ type: string; [key: string]: THandler | string }>;

  return createServerRoute({
    endpoint: config.endpoint,
    options: {
      access: 'internal',
    },
    security: {
      authz: {
        requiredPrivileges: [STREAMS_API_PRIVILEGES.read],
      },
    },
    params: config.schema,
    handler: async ({ params, request, getScopedClients, server }): Promise<SuggestionResponse> => {
      // Check pricing tier availability
      const isAvailableForTier = server.core.pricing.isFeatureAvailable(
        STREAMS_TIERED_ML_FEATURE.id
      );
      if (!isAvailableForTier) {
        throw new SecurityError('Cannot access API on the current pricing tier');
      }

      // Get scoped clients
      const { inferenceClient, scopedClusterClient, streamsClient, fieldsMetadataClient } =
        await getScopedClients({
          request,
        });

      // Turn our promise into an Observable ServerSideEvent
      // This avoids timeout issues with long-running LLM requests
      return from(
        config.handler({
          params,
          inferenceClient,
          scopedClusterClient,
          streamsClient,
          fieldsMetadataClient,
          signal: getRequestAbortSignal(request),
        })
      ).pipe(
        map((result) => ({
          type: config.eventType,
          [config.eventType]: result,
        }))
      );
    },
  });
}
