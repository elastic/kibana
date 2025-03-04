/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  FlattenRecord,
  flattenRecord,
  namedFieldDefinitionConfigSchema,
  processorWithIdDefinitionSchema,
} from '@kbn/streams-schema';
import { z } from '@kbn/zod';
import { checkAccess } from '../../../lib/streams/stream_crud';
import { createServerRoute } from '../../create_server_route';
import { DefinitionNotFoundError } from '../../../lib/streams/errors/definition_not_found_error';
import { ProcessingSimulationParams, simulateProcessing } from './simulation_handler';
import { handleProcessingSuggestion } from './suggestions_handler';

const paramsSchema = z.object({
  path: z.object({ name: z.string() }),
  body: z.object({
    processing: z.array(processorWithIdDefinitionSchema),
    documents: z.array(flattenRecord),
    detected_fields: z.array(namedFieldDefinitionConfigSchema).optional(),
  }),
}) satisfies z.Schema<ProcessingSimulationParams>;

export const simulateProcessorRoute = createServerRoute({
  endpoint: 'POST /internal/streams/{name}/processing/_simulate',
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
  params: paramsSchema,
  handler: async ({ params, request, getScopedClients }) => {
    const { scopedClusterClient, streamsClient } = await getScopedClients({ request });

    const { read } = await checkAccess({ name: params.path.name, scopedClusterClient });
    if (!read) {
      throw new DefinitionNotFoundError(`Stream definition for ${params.path.name} not found.`);
    }

    return simulateProcessing({ params, scopedClusterClient, streamsClient });
  },
});

export interface ProcessingSuggestionBody {
  field: string;
  connectorId: string;
  samples: FlattenRecord[];
}

const processingSuggestionSchema = z.object({
  field: z.string(),
  connectorId: z.string(),
  samples: z.array(flattenRecord),
});

const suggestionsParamsSchema = z.object({
  path: z.object({ name: z.string() }),
  body: processingSuggestionSchema,
});

export const processingSuggestionRoute = createServerRoute({
  endpoint: 'POST /internal/streams/{name}/processing/_suggestions',
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
  params: suggestionsParamsSchema,
  handler: async ({ params, request, logger, getScopedClients }) => {
    const { inferenceClient, scopedClusterClient, streamsClient } = await getScopedClients({
      request,
    });
    return handleProcessingSuggestion(
      params.path.name,
      params.body,
      inferenceClient,
      scopedClusterClient,
      streamsClient
    );
  },
});

export const processingRoutes = {
  ...simulateProcessorRoute,
  ...processingSuggestionRoute,
};
