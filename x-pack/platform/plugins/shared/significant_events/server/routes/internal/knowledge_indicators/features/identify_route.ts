/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import { z } from '@kbn/zod/v4';
import { getStreamSamplingSource, getStreamTypeFromDefinition } from '@kbn/streams-schema';
import type { InferenceDocument } from '@kbn/streams-ai';
import {
  MAX_ID_LENGTH,
  SIGNIFICANT_EVENTS_KI_EXTRACTION_INFERENCE_FEATURE_ID,
} from '@kbn/significant-events-schema';
import { isInferenceProviderError } from '@kbn/inference-common';
import { createServerRoute } from '../../../create_server_route';
import { assertNotPaused } from '../../../utils/assert_not_paused';
import { assertSignificantEventsAccess } from '../../../utils/assert_significant_events_access';
import { STREAMS_API_PRIVILEGES } from '../../../../../common/constants';
import { resolveConnectorForFeature } from '../../../utils/resolve_connector_for_feature';
import { getRequestAbortSignal } from '../../../utils/get_request_abort_signal';
import { formatInferenceProviderError } from '../../../utils/create_connector_sse_error';
import {
  MS_PER_DAY,
  buildTelemetry,
  identifyInferredFeatures,
  identifyComputedFeatures,
  MAX_INFERENCE_DOCUMENTS_BYTES,
  MAX_INFERENCE_DOCUMENT_BYTES,
  MAX_INFERENCE_DOCUMENT_FIELDS,
  MAX_INFERENCE_FIELD_NAME_LENGTH,
  prepareInferredSampling,
} from '../../../../lib/significant_events/features';
import { shouldIdentifyFeatures } from '../../../../lib/significant_events/features/should_identify_features';
import { isSignificantEventsSemanticCodeSearchGroundingEnabled } from '../../../../lib/semantic_code_search_grounding/is_significant_events_semantic_code_search_grounding_enabled';
import type { SyncWorkflowService } from '../../../../lib/workflows/sync_workflow';
import type { SignificantEventsMaintenanceService } from '../../../../lib/maintenance/maintenance_service';
import { stateBlocksNewActivity } from '../../../../../common/maintenance/state_machine';

const getSerializedByteLength = (value: unknown) =>
  Buffer.byteLength(JSON.stringify(value), 'utf8');

const inferenceDocumentSchema: z.ZodType<InferenceDocument> = z
  .object({
    _id: z.string().max(MAX_ID_LENGTH).optional(),
    fields: z
      .record(z.string().max(MAX_INFERENCE_FIELD_NAME_LENGTH), z.unknown())
      .refine((fields) => Object.keys(fields).length <= MAX_INFERENCE_DOCUMENT_FIELDS, {
        message: `Documents cannot contain more than ${MAX_INFERENCE_DOCUMENT_FIELDS} fields`,
      }),
  })
  .refine((document) => getSerializedByteLength(document) <= MAX_INFERENCE_DOCUMENT_BYTES, {
    message: `Documents cannot exceed ${MAX_INFERENCE_DOCUMENT_BYTES} serialized bytes`,
  });

const inferenceDocumentsSchema = z
  .array(inferenceDocumentSchema)
  .min(1)
  .max(100)
  .refine((documents) => getSerializedByteLength(documents) <= MAX_INFERENCE_DOCUMENTS_BYTES, {
    message: `Documents cannot exceed ${MAX_INFERENCE_DOCUMENTS_BYTES} serialized bytes in aggregate`,
  });

// Best-effort bootstrap of the standalone KI sync (groundedness) sweep workflow,
// which runs under a request whose API key can schedule the workflow trigger.
// Only the inferred route bootstraps: it runs at least once per identification
// pass and always precedes computed identification, so hooking it covers every
// path. Idempotent and non-blocking — a failure here must never fail extraction.
const bootstrapSyncWorkflow = async ({
  syncWorkflowService,
  maintenanceService,
  request,
  logger,
}: {
  syncWorkflowService: SyncWorkflowService | undefined;
  maintenanceService: SignificantEventsMaintenanceService;
  request: Parameters<SyncWorkflowService['ensureEnabled']>[0]['request'];
  logger: { warn: (message: string) => void };
}): Promise<void> => {
  if (!syncWorkflowService) {
    return;
  }
  try {
    const state = await maintenanceService.getState({ request });
    if (stateBlocksNewActivity(state)) {
      return;
    }
    await syncWorkflowService.ensureEnabled({ request });
  } catch (error) {
    logger.warn(
      `Failed to ensure KI sync workflow is enabled: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
};

const prepareInferredSamplingRoute = createServerRoute({
  endpoint: 'POST /internal/streams/{streamName}/features/_identify/inferred/prepare',
  options: {
    access: 'internal',
    summary: 'Sample documents for one inferred feature identification iteration',
    timeout: { idleSocket: 300_000 },
  },
  security: {
    authz: {
      requiredPrivileges: [STREAMS_API_PRIVILEGES.manage],
    },
  },
  params: z.object({
    path: z.object({ streamName: z.string().max(MAX_ID_LENGTH) }),
    body: z
      .object({
        start: z.number().optional(),
        end: z.number().optional(),
        runId: z.string().max(MAX_ID_LENGTH).optional(),
        iteration: z.number().int().min(1).optional(),
        sampleSize: z.number().int().min(1).max(100).optional(),
        entityFilteredRatio: z.number().min(0).max(1).optional(),
        diverseRatio: z.number().min(0).max(1).optional(),
        maxEntityFilters: z.number().int().min(1).max(50).optional(),
        samplingTimeoutMs: z.number().int().min(1_000).max(240_000).optional(),
      })
      .nullable()
      .optional(),
  }),
  handler: async ({ params, request, getScopedClients, server, logger, maintenanceService }) => {
    const scopedClients = await getScopedClients({ request });
    const { streamDataEsClient, streamsClient, tuningConfig, licensing } = scopedClients;

    await assertSignificantEventsAccess({ server, licensing });
    await assertNotPaused({ maintenanceService, request });

    const { streamName } = params.path;
    const routeLogger = logger.get('features_identification', 'prepare', streamName);
    const now = Date.now();
    const {
      start = now - MS_PER_DAY,
      end = now,
      runId = uuidv4(),
      iteration = 1,
      sampleSize = tuningConfig.sample_size,
      entityFilteredRatio = tuningConfig.entity_filtered_ratio,
      diverseRatio = tuningConfig.diverse_ratio,
      maxEntityFilters = tuningConfig.max_entity_filters,
      samplingTimeoutMs = tuningConfig.sampling_timeout_ms,
    } = params.body ?? {};

    const [kiClient, stream] = await Promise.all([
      scopedClients.getKnowledgeIndicatorClient(),
      streamsClient.getStream(streamName),
    ]);

    return prepareInferredSampling({
      esClient: streamDataEsClient,
      kiClient,
      streamName,
      samplingSource: getStreamSamplingSource(stream),
      start,
      end,
      runId,
      logger: routeLogger,
      sampleSize,
      entityFilteredRatio,
      diverseRatio,
      maxEntityFilters,
      iteration,
      samplingTimeoutMs,
    });
  },
});

const identifyInferredFeaturesRoute = createServerRoute({
  endpoint: 'POST /internal/streams/{streamName}/features/_identify/inferred',
  options: {
    access: 'internal',
    summary: 'Run LLM inference and reconcile KI features for one iteration',
    timeout: { idleSocket: 300_000 },
  },
  security: {
    authz: {
      requiredPrivileges: [STREAMS_API_PRIVILEGES.manage],
    },
  },
  params: z.object({
    path: z.object({ streamName: z.string().max(MAX_ID_LENGTH) }),
    body: z.object({
      connectorId: z.string().max(MAX_ID_LENGTH).optional(),
      runId: z.string().max(MAX_ID_LENGTH).optional(),
      iteration: z.number().optional(),
      documents: inferenceDocumentsSchema,
      samplingTelemetry: z.object({
        totalFilters: z.number().int().min(0),
        filtersCapped: z.boolean(),
        hasFilteredDocuments: z.boolean(),
      }),
      maxExcludedFeaturesInPrompt: z.number().optional(),
      maxPreviouslyIdentifiedFeatures: z.number().optional(),
    }),
  }),
  handler: async ({
    params,
    request,
    getScopedClients,
    server,
    logger,
    telemetry,
    syncWorkflowService,
    maintenanceService,
  }) => {
    const scopedClients = await getScopedClients({ request });
    const { scopedClusterClient, streamsClient, inferenceClient, tuningConfig, licensing } =
      scopedClients;

    await assertSignificantEventsAccess({ server, licensing });
    await assertNotPaused({ maintenanceService, request });

    const { streamName } = params.path;
    const routeLogger = logger.get('features_identification', 'inferred', streamName);
    const now = Date.now();
    const {
      connectorId: connectorIdOverride,
      runId = uuidv4(),
      iteration,
      documents,
      samplingTelemetry,
      maxExcludedFeaturesInPrompt = tuningConfig.max_excluded_features_in_prompt,
      maxPreviouslyIdentifiedFeatures,
    } = params.body;
    const { totalFilters, filtersCapped, hasFilteredDocuments } = samplingTelemetry;

    const [connectorId, stream, kiClient] = await Promise.all([
      connectorIdOverride
        ? Promise.resolve(connectorIdOverride)
        : resolveConnectorForFeature({
            searchInferenceEndpoints: server.searchInferenceEndpoints,
            featureId: SIGNIFICANT_EVENTS_KI_EXTRACTION_INFERENCE_FEATURE_ID,
            featureName: 'knowledge indicator extraction',
            request,
          }),
      streamsClient.getStream(streamName),
      scopedClients.getKnowledgeIndicatorClient(),
    ]);

    const streamType = getStreamTypeFromDefinition(stream);

    try {
      const result = await identifyInferredFeatures({
        esClient: scopedClusterClient.asCurrentUser,
        kiClient,
        agentBuilder: server.agentBuilder,
        request,
        connectorId,
        logger: routeLogger,
        signal: getRequestAbortSignal(request),
        streamName,
        streamType,
        runId,
        documents,
        totalFilters,
        filtersCapped,
        hasFilteredDocuments,
        iteration,
        tuning: {
          max_excluded_features_in_prompt: maxExcludedFeaturesInPrompt,
          maxPreviouslyIdentifiedFeatures,
        },
        trackFeaturesIdentified: (data) => telemetry.trackFeaturesIdentified(data),
      });

      await bootstrapSyncWorkflow({
        syncWorkflowService,
        maintenanceService,
        request,
        logger: routeLogger,
      });

      return { ...result, connectorId };
    } catch (error) {
      routeLogger.error(
        `Inferred feature identification failed for stream [${streamName}]: ${
          error instanceof Error ? error.message : String(error)
        }`
      );

      telemetry.trackFeaturesIdentified(
        buildTelemetry(
          {
            run_id: runId,
            connector_id: connectorId,
            iteration: iteration ?? 1,
            stream_name: streamName,
            stream_type: streamType,
            docs_count: documents.length,
            excluded_features_count: 0,
            total_filters: totalFilters,
            filters_capped: filtersCapped,
            has_filtered_documents: hasFilteredDocuments,
          },
          Date.now() - now,
          { state: 'failure' }
        )
      );

      if (isInferenceProviderError(error)) {
        const connector = await inferenceClient
          .getConnectorById(connectorId)
          .catch(() => undefined);
        if (connector) {
          throw new Error(formatInferenceProviderError(error, connector));
        }
      }

      throw error;
    }
  },
});

const identifyComputedFeaturesRoute = createServerRoute({
  endpoint: 'POST /internal/streams/{streamName}/features/_identify/computed',
  options: {
    access: 'internal',
    summary: 'Generate and persist computed KI features for a stream',
    timeout: { idleSocket: 300_000 },
  },
  security: {
    authz: {
      requiredPrivileges: [STREAMS_API_PRIVILEGES.manage],
    },
  },
  params: z.object({
    path: z.object({ streamName: z.string().max(MAX_ID_LENGTH) }),
    body: z
      .object({
        start: z.number().optional(),
        end: z.number().optional(),
        runId: z.string().max(MAX_ID_LENGTH).optional(),
        computedFeaturesTimeoutMs: z.number().int().min(1_000).max(240_000).optional(),
      })
      .nullable()
      .optional(),
  }),
  handler: async ({
    params,
    request,
    getScopedClients,
    server,
    logger,
    telemetry,
    maintenanceService,
  }) => {
    const scopedClients = await getScopedClients({ request });
    const { streamDataEsClient, streamsClient, licensing, tuningConfig } = scopedClients;

    await assertSignificantEventsAccess({ server, licensing });
    await assertNotPaused({ maintenanceService, request });

    const { streamName } = params.path;
    const routeLogger = logger.get('features_identification', 'computed', streamName);
    const now = Date.now();
    const {
      start = now - MS_PER_DAY,
      end = now,
      runId = uuidv4(),
      computedFeaturesTimeoutMs = tuningConfig.computed_features_timeout_ms,
    } = params.body ?? {};

    const [kiClient, stream] = await Promise.all([
      scopedClients.getKnowledgeIndicatorClient(),
      streamsClient.getStream(streamName),
    ]);

    // Enable code_analysis grounding only when the feature flag is on and Agent
    // Builder is available; otherwise the provider is omitted and the computed
    // feature is skipped.
    const codeGroundingEnabled =
      Boolean(server.agentBuilder?.tools) &&
      (await isSignificantEventsSemanticCodeSearchGroundingEnabled(server.core.featureFlags));

    try {
      const { features: computedFeatures, errors } = await identifyComputedFeatures({
        stream,
        streamName,
        start,
        end,
        esClient: streamDataEsClient,
        kiClient,
        logger: routeLogger,
        runId,
        signal: getRequestAbortSignal(request),
        timeoutMs: computedFeaturesTimeoutMs,
        ...(codeGroundingEnabled
          ? { agentBuilderTools: server.agentBuilder?.tools, request, telemetry }
          : {}),
      });

      return {
        computedFeatures,
        computedFeaturesCount: computedFeatures.length,
        errors,
      };
    } catch (error) {
      routeLogger.error(
        `Computed feature identification failed for stream [${streamName}]: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
      throw error;
    }
  },
});

const shouldIdentifyRoute = createServerRoute({
  endpoint: 'GET /internal/streams/{streamName}/features/_should_identify',
  options: {
    access: 'internal',
    summary: 'Check whether KI features identification should run for a stream',
  },
  security: {
    authz: {
      requiredPrivileges: [STREAMS_API_PRIVILEGES.read],
    },
  },
  params: z.object({
    path: z.object({ streamName: z.string().max(MAX_ID_LENGTH) }),
    query: z.object({
      thresholdHours: z.coerce.number().min(0),
    }),
  }),
  handler: async ({ params, request, getScopedClients, server }) => {
    const scopedClients = await getScopedClients({ request });
    const { licensing } = scopedClients;

    await assertSignificantEventsAccess({ server, licensing });
    // Intentionally not guarded by assertNotPaused: continuous onboarding
    // calls this route to decide whether to skip a stream, and a 409 here
    // would turn a clean skip into a workflow failure.

    const kiClient = await scopedClients.getKnowledgeIndicatorClient();
    return shouldIdentifyFeatures({
      kiClient,
      streamName: params.path.streamName,
      thresholdHours: params.query.thresholdHours,
    });
  },
});

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

export const internalIdentifyKIFeaturesRoutes = {
  ...prepareInferredSamplingRoute,
  ...identifyInferredFeaturesRoute,
  ...identifyComputedFeaturesRoute,
  ...shouldIdentifyRoute,
};
