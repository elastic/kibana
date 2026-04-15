/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import {
  featureSchema,
  getStreamTypeFromDefinition,
  STREAMS_SIG_EVENTS_KI_EXTRACTION_INFERENCE_FEATURE_ID,
} from '@kbn/streams-schema';
import { createServerRoute } from '../../../create_server_route';
import { assertSignificantEventsAccess } from '../../../utils/assert_significant_events_access';
import { STREAMS_API_PRIVILEGES } from '../../../../../common/constants';
import { resolveConnectorForFeature } from '../../../utils/resolve_connector_for_feature';
import { getRequestAbortSignal } from '../../../utils/get_request_abort_signal';
import {
  EMPTY_TOKENS,
  identifyInferredFeatures,
  identifyComputedFeatures,
} from '../../../../lib/sig_events/features/features_identification_service';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

const tokensSchema = z.object({
  prompt: z.number(),
  completion: z.number(),
  total: z.number(),
  cached: z.number().optional(),
});

const featureSummarySchema = z.object({
  id: z.string(),
  title: z.string(),
});

const iterationResultSchema = z.object({
  iteration: z.number(),
  durationMs: z.number(),
  state: z.enum(['success', 'failure']),
  tokensUsed: tokensSchema,
  newFeatures: z.array(featureSummarySchema),
  updatedFeatures: z.array(featureSummarySchema),
});

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
      runId: z.string(),
      iteration: z.number(),
      discoveredFeatures: z.array(featureSchema),
      featureTtlDays: z.number().optional(),
      sampleSize: z.number().optional(),
      entityFilteredRatio: z.number().min(0).max(1).optional(),
      diverseRatio: z.number().min(0).max(1).optional(),
      maxEntityFilters: z.number().optional(),
      maxExcludedFeaturesInPrompt: z.number().optional(),
      maxPreviouslyIdentifiedFeatures: z.number().optional(),
      totalTokensUsed: tokensSchema.optional(),
      successCount: z.number().optional(),
      iterationResults: z.array(iterationResultSchema).optional().default([]),
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
    const now = Date.now();
    const {
      start = now - MS_PER_DAY,
      end = now,
      connectorId: connectorIdOverride,
      runId,
      iteration,
      discoveredFeatures,
      featureTtlDays = tuningConfig.feature_ttl_days,
      sampleSize = tuningConfig.sample_size,
      entityFilteredRatio = tuningConfig.entity_filtered_ratio,
      diverseRatio = tuningConfig.diverse_ratio,
      maxEntityFilters = tuningConfig.max_entity_filters,
      maxExcludedFeaturesInPrompt = tuningConfig.max_excluded_features_in_prompt,
      maxPreviouslyIdentifiedFeatures,
      totalTokensUsed = { ...EMPTY_TOKENS },
      successCount = 0,
      iterationResults = [],
    } = params.body;

    const taskLogger = logger.get('features_identification_workflow', streamName);

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

    return identifyInferredFeatures({
      esClient: scopedClusterClient.asCurrentUser,
      featureClient,
      soClient,
      inferenceClient: inferenceClient.bindTo({ connectorId }),
      logger: taskLogger,
      signal: getRequestAbortSignal(request),
      streamName,
      streamType: getStreamTypeFromDefinition(stream),
      start,
      end,
      runId,
      iteration,
      state: {
        discoveredFeatures,
        totalTokensUsed,
        successCount,
        iterationResults,
      },
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
      iteration: z.number().optional(),
      successCount: z.number().optional(),
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
    const now = Date.now();
    const {
      start = now - MS_PER_DAY,
      end = now,
      iteration = 0,
      successCount = 0,
      featureTtlDays = tuningConfig.feature_ttl_days,
    } = params.body;

    if (iteration > 0 && successCount === 0) {
      throw new Error(`All iterations failed for stream ${streamName}`);
    }

    const [featureClient, stream] = await Promise.all([
      getFeatureClient(),
      streamsClient.getStream(streamName),
    ]);

    const computedFeatures = await identifyComputedFeatures({
      stream,
      streamName,
      start,
      end,
      esClient: scopedClusterClient.asCurrentUser,
      featureClient,
      logger: logger.get('features_identification_workflow', streamName),
      featureTtlDays,
    });

    return {
      computedFeatures,
      computedFeaturesCount: computedFeatures.length,
    };
  },
});

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

export const identifyFeaturesRoutes = {
  ...identifyInferredFeaturesRoute,
  ...identifyComputedFeaturesRoute,
};
