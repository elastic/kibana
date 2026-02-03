/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FlattenRecord } from '@kbn/streams-schema';
import {
  flattenRecord,
  isEnabledFailureStore,
  namedFieldDefinitionConfigSchema,
} from '@kbn/streams-schema';
import type { DataStreamWithFailureStore } from '@kbn/streams-schema/src/models/ingest/failure_store';
import { z } from '@kbn/zod';
import { streamlangDSLSchema } from '@kbn/streamlang';
import { from, map } from 'rxjs';
import type { ServerSentEventBase } from '@kbn/sse-utils';
import type { Observable } from 'rxjs';
import { FailureStoreNotEnabledError } from '../../../../lib/streams/errors/failure_store_not_enabled_error';
import { STREAMS_API_PRIVILEGES, STREAMS_TIERED_ML_FEATURE } from '../../../../../common/constants';
import { SecurityError } from '../../../../lib/streams/errors/security_error';
import { checkAccess, getFailureStore } from '../../../../lib/streams/stream_crud';
import { createServerRoute } from '../../../create_server_route';
import type { ProcessingSimulationParams } from './simulation_handler';
import { simulateProcessing } from './simulation_handler';
import {
  handleProcessingDateSuggestions,
  processingDateSuggestionsSchema,
} from './date_suggestions_handler';
import {
  handleProcessingGrokSuggestions,
  processingGrokSuggestionsSchema,
} from './grok_suggestions_handler';
import {
  handleProcessingDissectSuggestions,
  processingDissectSuggestionsSchema,
} from './dissect_suggestions_handler';
import { getRequestAbortSignal } from '../../../utils/get_request_abort_signal';
import type { FailureStoreSamplesResponse } from './failure_store_samples_handler';
import { getFailureStoreSamples } from './failure_store_samples_handler';
import { isNoLLMSuggestionsError } from './no_llm_suggestions_error';

const paramsSchema = z.object({
  path: z.object({ name: z.string() }),
  body: z.object({
    processing: streamlangDSLSchema,
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
    const { scopedClusterClient, streamsClient, fieldsMetadataClient } = await getScopedClients({
      request,
    });

    const { read } = await checkAccess({ name: params.path.name, scopedClusterClient });
    if (!read) {
      throw new SecurityError(`Cannot read stream ${params.path.name}, insufficient privileges`);
    }

    return simulateProcessing({ params, scopedClusterClient, streamsClient, fieldsMetadataClient });
  },
});

export interface ProcessingSuggestionBody {
  field: string;
  connectorId: string;
  samples: FlattenRecord[];
}

type GrokSuggestionResponse = Observable<
  ServerSentEventBase<
    'grok_suggestion',
    { grokProcessor: Awaited<ReturnType<typeof handleProcessingGrokSuggestions>> | null }
  >
>;

export const processingGrokSuggestionRoute = createServerRoute({
  endpoint: 'POST /internal/streams/{name}/processing/_suggestions/grok',
  options: {
    access: 'internal',
  },
  security: {
    authz: {
      requiredPrivileges: [STREAMS_API_PRIVILEGES.read],
    },
  },
  params: processingGrokSuggestionsSchema,
  handler: async ({
    params,
    request,
    getScopedClients,
    server,
    logger,
  }): Promise<GrokSuggestionResponse> => {
    const isAvailableForTier = server.core.pricing.isFeatureAvailable(STREAMS_TIERED_ML_FEATURE.id);
    if (!isAvailableForTier) {
      throw new SecurityError('Cannot access API on the current pricing tier');
    }

    const { inferenceClient, scopedClusterClient, streamsClient, fieldsMetadataClient } =
      await getScopedClients({
        request,
      });

    // Turn our promise into an Observable ServerSideEvent. The only reason we're streaming the
    // response here is to avoid timeout issues prevalent with long-running requests to LLMs.
    return from(
      handleProcessingGrokSuggestions({
        params,
        inferenceClient,
        streamsClient,
        scopedClusterClient,
        fieldsMetadataClient,
        signal: getRequestAbortSignal(request),
        logger,
      }).catch((error) => {
        if (isNoLLMSuggestionsError(error)) {
          logger.debug('No LLM suggestions available for grok processing');
          // Return null to indicate no suggestions were generated
          return null;
        }
        throw error;
      })
    ).pipe(
      map((grokProcessor) => ({
        grokProcessor,
        type: 'grok_suggestion' as const,
      }))
    );
  },
});

type DissectSuggestionResponse = Observable<
  ServerSentEventBase<
    'dissect_suggestion',
    { dissectProcessor: Awaited<ReturnType<typeof handleProcessingDissectSuggestions>> | null }
  >
>;

export const processingDissectSuggestionRoute = createServerRoute({
  endpoint: 'POST /internal/streams/{name}/processing/_suggestions/dissect',
  options: {
    access: 'internal',
  },
  security: {
    authz: {
      requiredPrivileges: [STREAMS_API_PRIVILEGES.read],
    },
  },
  params: processingDissectSuggestionsSchema,
  handler: async ({
    params,
    request,
    getScopedClients,
    server,
    logger,
  }): Promise<DissectSuggestionResponse> => {
    const isAvailableForTier = server.core.pricing.isFeatureAvailable(STREAMS_TIERED_ML_FEATURE.id);
    if (!isAvailableForTier) {
      throw new SecurityError('Cannot access API on the current pricing tier');
    }

    const { inferenceClient, scopedClusterClient, streamsClient, fieldsMetadataClient } =
      await getScopedClients({
        request,
      });

    // Turn our promise into an Observable ServerSideEvent. The only reason we're streaming the
    // response here is to avoid timeout issues prevalent with long-running requests to LLMs.
    return from(
      handleProcessingDissectSuggestions({
        params,
        inferenceClient,
        streamsClient,
        scopedClusterClient,
        fieldsMetadataClient,
        signal: getRequestAbortSignal(request),
        logger,
      }).catch((error) => {
        if (isNoLLMSuggestionsError(error)) {
          logger.debug('No LLM suggestions available for dissect processing');
          // Return null to indicate no suggestions were generated
          return null;
        }
        throw error;
      })
    ).pipe(
      map((dissectProcessor) => ({
        dissectProcessor,
        type: 'dissect_suggestion' as const,
      }))
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
      throw new SecurityError('Cannot access API on the current pricing tier');
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

const failureStoreSamplesParamsSchema = z.object({
  path: z.object({ name: z.string() }),
  query: z
    .object({
      size: z.coerce.number().optional(),
      start: z.string().optional(),
      end: z.string().optional(),
    })
    .optional(),
});

export const failureStoreSamplesRoute = createServerRoute({
  endpoint: 'GET /internal/streams/{name}/processing/_failure_store_samples',
  options: {
    access: 'internal',
    summary: 'Get failure store samples with parent processors applied',
    description:
      'Fetches documents from the failure store and applies all configured processors from parent streams',
  },
  security: {
    authz: {
      requiredPrivileges: [STREAMS_API_PRIVILEGES.read],
    },
  },
  params: failureStoreSamplesParamsSchema,
  handler: async ({ params, request, getScopedClients }): Promise<FailureStoreSamplesResponse> => {
    const { scopedClusterClient, streamsClient, fieldsMetadataClient } = await getScopedClients({
      request,
    });

    const { read } = await checkAccess({ name: params.path.name, scopedClusterClient });
    if (!read) {
      throw new SecurityError(`Cannot read stream ${params.path.name}, insufficient privileges`);
    }

    const { read_failure_store: readFailureStore } = await streamsClient.getPrivileges(
      params.path.name
    );
    if (!readFailureStore) {
      throw new SecurityError(
        `Cannot read failure store for stream ${params.path.name}, insufficient privileges`
      );
    }

    // Check if failure store is enabled for this stream
    const dataStream = await streamsClient.getDataStream(params.path.name);
    const effectiveFailureStore = getFailureStore({
      dataStream: dataStream as DataStreamWithFailureStore,
    });
    if (!isEnabledFailureStore(effectiveFailureStore)) {
      throw new FailureStoreNotEnabledError(
        `Failure store is not enabled for stream ${params.path.name}`
      );
    }

    return getFailureStoreSamples({
      params,
      scopedClusterClient,
      streamsClient,
      fieldsMetadataClient,
    });
  },
});

export const internalProcessingRoutes = {
  ...simulateProcessorRoute,
  ...processingGrokSuggestionRoute,
  ...processingDissectSuggestionRoute,
  ...processingDateSuggestionsRoute,
  ...failureStoreSamplesRoute,
};
