/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import { z } from '@kbn/zod/v4';
import {
  featureSchema,
  iterationResultSchema,
  getStreamTypeFromDefinition,
  STREAMS_SIG_EVENTS_KI_EXTRACTION_INFERENCE_FEATURE_ID,
} from '@kbn/streams-schema';
import { isInferenceProviderError } from '@kbn/inference-common';
import { createServerRoute } from '../../../create_server_route';
import { assertSignificantEventsAccess } from '../../../utils/assert_significant_events_access';
import { STREAMS_API_PRIVILEGES } from '../../../../../common/constants';
import { resolveConnectorForFeature } from '../../../utils/resolve_connector_for_feature';
import { getRequestAbortSignal } from '../../../utils/get_request_abort_signal';
import { formatInferenceProviderError } from '../../../utils/create_connector_sse_error';
import {
  MS_PER_DAY,
  identifyInferredFeatures,
  identifyComputedFeatures,
} from '../../../../lib/sig_events/features';

// ---------------------------------------------------------------------------
// Route 1: Identify inferred features (one iteration: sample + infer + reconcile)
// ---------------------------------------------------------------------------

const identifyInferredFeaturesRoute = createServerRoute({
  endpoint: 'POST /internal/streams/{name}/features/_identify/inferred',
  options: {
    access: 'internal',
    summary: 'Sample documents, run LLM inference, and reconcile KI features for one iteration',
    timeout: { idleSocket: 300_000 },
  },
  security: {
    authz: {
      requiredPrivileges: [STREAMS_API_PRIVILEGES.manage],
    },
  },
  params: z.object({
    path: z.object({ name: z.string() }),
    body: z.object({
      connectorId: z.string().optional(),
      start: z.number().optional(),
      end: z.number().optional(),
      runId: z.string().optional(),
      // Caller must pass back discoveredFeatures from previous iterations so
      // the service can distinguish intra-run features (merge semantics) from
      // stored features (full replace). These are already persisted to ES but
      // cannot be distinguished from pre-existing features without this context.
      discoveredFeatures: z.array(featureSchema).optional().default([]),
      iterationResults: z.array(iterationResultSchema).optional().default([]),
      featureTtlDays: z.number().optional(),
      sampleSize: z.number().optional(),
      entityFilteredRatio: z.number().min(0).max(1).optional(),
      diverseRatio: z.number().min(0).max(1).optional(),
      maxEntityFilters: z.number().optional(),
      maxExcludedFeaturesInPrompt: z.number().optional(),
      maxPreviouslyIdentifiedFeatures: z.number().optional(),
    }),
  }),
  handler: async ({ params, request, getScopedClients, server, logger, telemetry }) => {
    const {
      scopedClusterClient,
      getFeatureClient,
      streamsClient,
      inferenceClient,
      soClient,
      tuningConfig,
      licensing,
      uiSettingsClient,
    } = await getScopedClients({ request });

    await assertSignificantEventsAccess({ server, licensing, uiSettingsClient });

    const { name: streamName } = params.path;
    const routeLogger = logger.get('features_identification', 'inferred', streamName);
    const now = Date.now();
    const {
      start = now - MS_PER_DAY,
      end = now,
      connectorId: connectorIdOverride,
      runId = uuidv4(),
      discoveredFeatures,
      iterationResults,
      featureTtlDays = tuningConfig.feature_ttl_days,
      sampleSize = tuningConfig.sample_size,
      entityFilteredRatio = tuningConfig.entity_filtered_ratio,
      diverseRatio = tuningConfig.diverse_ratio,
      maxEntityFilters = tuningConfig.max_entity_filters,
      maxExcludedFeaturesInPrompt = tuningConfig.max_excluded_features_in_prompt,
      maxPreviouslyIdentifiedFeatures,
    } = params.body;

    const [connectorId, stream] = await Promise.all([
      connectorIdOverride
        ? Promise.resolve(connectorIdOverride)
        : resolveConnectorForFeature({
            searchInferenceEndpoints: server.searchInferenceEndpoints,
            featureId: STREAMS_SIG_EVENTS_KI_EXTRACTION_INFERENCE_FEATURE_ID,
            featureName: 'knowledge indicator extraction',
            request,
          }),
      streamsClient.getStream(streamName),
    ]);

    const featureClient = await getFeatureClient();

    try {
      return await identifyInferredFeatures({
        esClient: scopedClusterClient.asCurrentUser,
        featureClient,
        soClient,
        inferenceClient: inferenceClient.bindTo({ connectorId }),
        logger: routeLogger,
        signal: getRequestAbortSignal(request),
        streamName,
        streamType: getStreamTypeFromDefinition(stream),
        start,
        end,
        runId,
        state: { discoveredFeatures, iterationResults },
        tuning: {
          feature_ttl_days: featureTtlDays,
          sample_size: sampleSize,
          entity_filtered_ratio: entityFilteredRatio,
          diverse_ratio: diverseRatio,
          max_entity_filters: maxEntityFilters,
          max_excluded_features_in_prompt: maxExcludedFeaturesInPrompt,
          maxPreviouslyIdentifiedFeatures,
        },
        trackFeaturesIdentified: (data) => telemetry.trackFeaturesIdentified(data),
      });
    } catch (error) {
      routeLogger.error(
        `Inferred feature identification failed for stream [${streamName}] after ${
          iterationResults.length
        } completed iterations: ${error instanceof Error ? error.message : String(error)}`
      );

      telemetry.trackFeaturesIdentified({
        run_id: runId,
        iteration: iterationResults.length,
        stream_name: streamName,
        stream_type: getStreamTypeFromDefinition(stream),
        state: 'failure',
        docs_count: 0,
        features_new: 0,
        features_updated: 0,
        input_tokens_used: 0,
        output_tokens_used: 0,
        total_tokens_used: 0,
        cached_tokens_used: 0,
        duration_ms: Date.now() - now,
        total_filters: 0,
        filters_capped: false,
        has_filtered_documents: false,
        excluded_features_count: 0,
        llm_ignored_count: 0,
        code_ignored_count: 0,
      });

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

// ---------------------------------------------------------------------------
// Route 2: Identify computed features (generate and persist computed KI features)
// ---------------------------------------------------------------------------

const identifyComputedFeaturesRoute = createServerRoute({
  endpoint: 'POST /internal/streams/{name}/features/_identify/computed',
  options: {
    access: 'internal',
    summary: 'Generate and persist computed KI features for a stream',
  },
  security: {
    authz: {
      requiredPrivileges: [STREAMS_API_PRIVILEGES.manage],
    },
  },
  params: z.object({
    path: z.object({ name: z.string() }),
    body: z.object({
      start: z.number().optional(),
      end: z.number().optional(),
      featureTtlDays: z.number().optional(),
    }),
  }),
  handler: async ({ params, request, getScopedClients, server, logger }) => {
    const {
      scopedClusterClient,
      getFeatureClient,
      streamsClient,
      tuningConfig,
      licensing,
      uiSettingsClient,
    } = await getScopedClients({ request });

    await assertSignificantEventsAccess({ server, licensing, uiSettingsClient });

    const { name: streamName } = params.path;
    const routeLogger = logger.get('features_identification', 'computed', streamName);
    const now = Date.now();
    const {
      start = now - MS_PER_DAY,
      end = now,
      featureTtlDays = tuningConfig.feature_ttl_days,
    } = params.body;

    const [featureClient, stream] = await Promise.all([
      getFeatureClient(),
      streamsClient.getStream(streamName),
    ]);

    try {
      const computedFeatures = await identifyComputedFeatures({
        stream,
        streamName,
        start,
        end,
        esClient: scopedClusterClient.asCurrentUser,
        featureClient,
        logger: routeLogger,
        featureTtlDays,
      });

      return {
        computedFeatures,
        computedFeaturesCount: computedFeatures.length,
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

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

export const identifyFeaturesRoutes = {
  ...identifyInferredFeaturesRoute,
  ...identifyComputedFeaturesRoute,
};
