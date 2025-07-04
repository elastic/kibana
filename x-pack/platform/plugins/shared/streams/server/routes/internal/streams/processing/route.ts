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
import { STREAMS_API_PRIVILEGES, STREAMS_TIERED_ML_FEATURE } from '../../../../../common/constants';
import { SecurityError } from '../../../../lib/streams/errors/security_error';
import { checkAccess } from '../../../../lib/streams/stream_crud';
import { createServerRoute } from '../../../create_server_route';
import { ProcessingSimulationParams, simulateProcessing } from './simulation_handler';
import { handleProcessingSuggestion } from './suggestions_handler';
import {
  handleProcessingDateSuggestions,
  processingDateSuggestionsSchema,
} from './suggestions/date_suggestions_handler';

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
      requiredPrivileges: [STREAMS_API_PRIVILEGES.read],
    },
  },
  params: paramsSchema,
  handler: async ({ params, request, getScopedClients }) => {
    const { scopedClusterClient, streamsClient } = await getScopedClients({ request });

    const { read } = await checkAccess({ name: params.path.name, scopedClusterClient });
    if (!read) {
      throw new SecurityError(`Cannot read stream ${params.path.name}, insufficient privileges`);
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
      requiredPrivileges: [STREAMS_API_PRIVILEGES.read],
    },
  },
  params: suggestionsParamsSchema,
  handler: async ({ params, request, getScopedClients, server }) => {
    const isAvailableForTier = server.core.pricing.isFeatureAvailable(STREAMS_TIERED_ML_FEATURE.id);
    if (!isAvailableForTier) {
      throw new SecurityError(`Cannot access API on the current pricing tier`);
    }

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

export const processingDateSuggestionsRoute = createServerRoute({
  endpoint: 'POST /internal/streams/{name}/processing/_suggestions/date',
  options: {
    access: 'internal',
  },
  security: {
    authz: {
      requiredPrivileges: [STREAMS_API_PRIVILEGES.read],
    },
  },
  params: processingDateSuggestionsSchema,
  handler: async ({ params, request, getScopedClients, server }) => {
    const isAvailableForTier = server.core.pricing.isFeatureAvailable(STREAMS_TIERED_ML_FEATURE.id);
    if (!isAvailableForTier) {
      throw new SecurityError(`Cannot access API on the current pricing tier`);
    }

    const { scopedClusterClient, streamsClient } = await getScopedClients({ request });
    const { name } = params.path;

    const { read } = await checkAccess({ name, scopedClusterClient });
    if (!read) {
      throw new SecurityError(`Cannot read stream ${name}, insufficient privileges`);
    }
    const { text_structure: hasTextStructurePrivileges } = await streamsClient.getPrivileges(name);
    if (!hasTextStructurePrivileges) {
      throw new SecurityError(`Cannot access text structure capabilities, insufficient privileges`);
    }

    return handleProcessingDateSuggestions({ params, scopedClusterClient });
  },
});

export const internalProcessingRoutes = {
  ...simulateProcessorRoute,
  ...processingSuggestionRoute,
  ...processingDateSuggestionsRoute,
};
