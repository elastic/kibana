/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { isEqual } from 'lodash';
import { v4 as uuid, v5 as uuidv5 } from 'uuid';
import {
  type Feature,
  type BaseFeature,
  type IterationResult,
  isComputedFeature,
  isFeatureWithFilter,
  isDuplicateFeature,
  mergeFeature,
  toBaseFeature,
  getStreamTypeFromDefinition,
  featureSchema,
  baseFeatureSchema,
  ignoredFeatureSchema,
  STREAMS_SIG_EVENTS_KI_EXTRACTION_INFERENCE_FEATURE_ID,
} from '@kbn/streams-schema';
import {
  identifyFeatures,
  generateAllComputedFeatures,
  sumTokens,
  type ExcludedFeatureSummary,
  type IgnoredFeature,
} from '@kbn/streams-ai';
import type { ChatCompletionTokenCount } from '@kbn/inference-common';
import { createServerRoute } from '../../../create_server_route';
import { assertSignificantEventsAccess } from '../../../utils/assert_significant_events_access';
import { STREAMS_API_PRIVILEGES } from '../../../../../common/constants';
import { DEFAULT_SIG_EVENTS_TUNING_CONFIG } from '../../../../../common/sig_events_tuning_config';
import { fetchSampleDocuments } from '../../../../lib/tasks/task_definitions/features_identification/fetch_sample_documents';
import { resolveConnectorForFeature } from '../../../utils/resolve_connector_for_feature';
import { getRequestAbortSignal } from '../../../utils/get_request_abort_signal';
import { PromptsConfigService } from '../../../../lib/sig_events/saved_objects/prompts_config_service';

const EMPTY_TOKENS: ChatCompletionTokenCount = { prompt: 0, completion: 0, total: 0, cached: 0 };
const DEFAULT_MAX_PREVIOUSLY_IDENTIFIED_FEATURES = 100;

const searchHitSchema = z.looseObject({
  _index: z.string(),
  _id: z.string().optional(),
  _source: z.record(z.string(), z.unknown()).optional(),
  fields: z.record(z.string(), z.unknown()).optional(),
});

const toFeatureSummary = ({ id, title }: Feature) => ({ id, title: title ?? id });

const tokensSchema = z.object({
  prompt: z.number(),
  completion: z.number(),
  total: z.number(),
  cached: z.number().optional(),
});

function createFeatureMetadata(
  featureTtlDays: number = DEFAULT_SIG_EVENTS_TUNING_CONFIG.feature_ttl_days
) {
  const now = Date.now();
  const ttlMs = featureTtlDays * 24 * 60 * 60 * 1000;
  return {
    status: 'active' as const,
    last_seen: new Date(now).toISOString(),
    expires_at: new Date(now + ttlMs).toISOString(),
  };
}

function reconcileComputedFeatures({
  computedFeatures,
  streamName,
  featureTtlDays,
}: {
  computedFeatures: BaseFeature[];
  streamName: string;
  featureTtlDays?: number;
}): Feature[] {
  const metadata = createFeatureMetadata(featureTtlDays);
  return computedFeatures.map((feature) => ({
    ...feature,
    ...metadata,
    uuid: uuidv5(`${streamName}:${feature.id}`, uuidv5.DNS),
  }));
}

// ---------------------------------------------------------------------------
// Step 1: Setup — resolves connector, fetches stream/KI features/prompt
// ---------------------------------------------------------------------------

const setupRoute = createServerRoute({
  endpoint: 'POST /internal/streams/{name}/features/_identify/setup',
  options: {
    access: 'internal',
    summary: 'Prepare state for iterative KI feature identification',
  },
  security: {
    authz: {
      requiredPrivileges: [STREAMS_API_PRIVILEGES.manage],
    },
  },
  params: z.object({
    path: z.object({ name: z.string() }),
    body: z
      .object({
        start: z.number().optional(),
        end: z.number().optional(),
        connectorId: z.string().optional(),
      })
      .optional()
      .default({}),
  }),
  handler: async ({ params, request, getScopedClients, server, logger }) => {
    const { streamsClient, licensing, uiSettingsClient } = await getScopedClients({
      request,
    });

    await assertSignificantEventsAccess({ server, licensing, uiSettingsClient });

    const { name: streamName } = params.path;
    const now = Date.now();
    const body = params.body ?? {};
    const { start = now - 24 * 60 * 60 * 1000, end = now, connectorId: connectorIdOverride } = body;

    const connectorId =
      connectorIdOverride ??
      (await resolveConnectorForFeature({
        searchInferenceEndpoints: server.searchInferenceEndpoints,
        featureId: STREAMS_SIG_EVENTS_KI_EXTRACTION_INFERENCE_FEATURE_ID,
        featureName: 'knowledge indicator extraction',
        request,
      }));

    await streamsClient.getStream(streamName);

    return {
      connectorId,
      start,
      end,
    };
  },
});

// ---------------------------------------------------------------------------
// Step 2: Sample — fetch sample documents for one KI feature iteration
// ---------------------------------------------------------------------------

const sampleRoute = createServerRoute({
  endpoint: 'POST /internal/streams/{name}/features/_identify/sample',
  options: {
    access: 'internal',
    summary: 'Fetch sample documents for a KI feature identification iteration',
  },
  security: {
    authz: {
      requiredPrivileges: [STREAMS_API_PRIVILEGES.manage],
    },
  },
  params: z.object({
    path: z.object({ name: z.string() }),
    body: z.object({
      start: z.number(),
      end: z.number(),
      discoveredFeatures: z.array(featureSchema),
      sampleSize: z.number().optional(),
      entityFilteredRatio: z.number().min(0).max(1).optional(),
      diverseRatio: z.number().min(0).max(1).optional(),
      maxEntityFilters: z.number().optional(),
    }),
  }),
  handler: async ({ params, request, getScopedClients, server, logger }) => {
    const { scopedClusterClient, tuningConfig, licensing, uiSettingsClient } =
      await getScopedClients({ request });

    await assertSignificantEventsAccess({ server, licensing, uiSettingsClient });

    const { name: streamName } = params.path;
    const {
      start,
      end,
      discoveredFeatures,
      sampleSize = tuningConfig.sample_size,
      entityFilteredRatio = tuningConfig.entity_filtered_ratio,
      diverseRatio = tuningConfig.diverse_ratio,
      maxEntityFilters = tuningConfig.max_entity_filters,
    } = params.body;

    const taskLogger = logger.get('features_identification_workflow', streamName);
    const esClient = scopedClusterClient.asCurrentUser;

    const batchResult = await fetchSampleDocuments({
      esClient,
      index: streamName,
      start,
      end,
      features: discoveredFeatures.filter(isFeatureWithFilter),
      logger: taskLogger,
      size: sampleSize,
      entityFilteredRatio,
      diverseRatio,
      maxEntityFilters,
    });

    return {
      documents: batchResult.documents,
      hasDocuments: batchResult.documents.length > 0,
      docsCount: batchResult.documents.length,
      totalFilters: batchResult.totalFilters,
      filtersCapped: batchResult.filtersCapped,
      hasFilteredDocuments: batchResult.hasFilteredDocuments,
    };
  },
});

// ---------------------------------------------------------------------------
// Step 3: Infer — run one LLM call for KI feature identification (catches errors, never throws)
// ---------------------------------------------------------------------------

const inferRoute = createServerRoute({
  endpoint: 'POST /internal/streams/{name}/features/_identify/infer',
  options: {
    access: 'internal',
    summary: 'Run LLM inference for KI feature identification',
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
      connectorId: z.string(),
      documents: z.array(searchHitSchema),
      discoveredFeatures: z.array(featureSchema),
      maxExcludedFeaturesInPrompt: z.number().optional(),
      maxPreviouslyIdentifiedFeatures: z.number().optional(),
    }),
  }),
  handler: async ({ params, request, getScopedClients, server, logger }) => {
    const { featureClient, inferenceClient, soClient, tuningConfig, licensing, uiSettingsClient } =
      await getScopedClients({ request });

    await assertSignificantEventsAccess({ server, licensing, uiSettingsClient });

    const { name: streamName } = params.path;
    const {
      connectorId,
      documents,
      discoveredFeatures,
      maxExcludedFeaturesInPrompt = tuningConfig.max_excluded_features_in_prompt,
      maxPreviouslyIdentifiedFeatures = DEFAULT_MAX_PREVIOUSLY_IDENTIFIED_FEATURES,
    } = params.body;

    const taskLogger = logger.get('features_identification_workflow', streamName);
    const boundInferenceClient = inferenceClient.bindTo({ connectorId });
    const signal = getRequestAbortSignal(request);

    const [
      { hits: allFeatures },
      { hits: excludedFeatures },
      { featurePromptOverride: systemPrompt },
    ] = await Promise.all([
      featureClient.getFeatures(streamName),
      featureClient.getExcludedFeatures(streamName),
      new PromptsConfigService({ soClient, logger: taskLogger }).getPrompt(),
    ]);

    const discoveredUuids = new Set(discoveredFeatures.map((f) => f.uuid));
    const storedFeatures = allFeatures.filter(
      (f) => !isComputedFeature(f) && !discoveredUuids.has(f.uuid)
    );
    const allKnownFeatures = [...storedFeatures, ...discoveredFeatures];
    const topRanked = [...allKnownFeatures]
      .sort((a, b) => {
        const aEntity = a.type === 'entity' ? 0 : 1;
        const bEntity = b.type === 'entity' ? 0 : 1;
        if (aEntity !== bEntity) return aEntity - bEntity;
        return b.confidence - a.confidence;
      })
      .slice(0, maxPreviouslyIdentifiedFeatures);

    const excludedSummaries: ExcludedFeatureSummary[] = excludedFeatures
      .slice(0, maxExcludedFeaturesInPrompt)
      .map(({ id, type, subtype, title, description, properties }) => ({
        id,
        type,
        subtype,
        title,
        description,
        properties,
      }));

    try {
      const result = await identifyFeatures({
        streamName,
        sampleDocuments: documents,
        excludedFeatures: excludedSummaries,
        inferenceClient: boundInferenceClient,
        systemPrompt,
        logger: taskLogger,
        signal,
        previouslyIdentifiedFeatures: topRanked.map((f) => ({
          id: f.id,
          type: f.type,
          subtype: f.subtype,
          title: f.title,
          description: f.description,
          properties: f.properties,
        })),
      });

      return {
        success: true,
        rawFeatures: result.features,
        ignoredFeatures: result.ignoredFeatures,
        tokensUsed: result.tokensUsed,
      };
    } catch (error) {
      if (signal.aborted) {
        throw error;
      }
      const errorMsg = error instanceof Error ? error.message : String(error);
      taskLogger.warn(`LLM inference failed: ${errorMsg}`);
      return {
        success: false,
        rawFeatures: [],
        ignoredFeatures: [],
        tokensUsed: { ...EMPTY_TOKENS },
      };
    }
  },
});

// ---------------------------------------------------------------------------
// Step 4: Reconcile — merge, persist KI features, telemetry for one iteration
// ---------------------------------------------------------------------------

const reconcileRoute = createServerRoute({
  endpoint: 'POST /internal/streams/{name}/features/_identify/reconcile',
  options: {
    access: 'internal',
    summary: 'Reconcile and persist KI features from one identification iteration',
  },
  security: {
    authz: {
      requiredPrivileges: [STREAMS_API_PRIVILEGES.manage],
    },
  },
  params: z.object({
    path: z.object({ name: z.string() }),
    body: z.object({
      runId: z.string(),
      iteration: z.number(),
      inferSuccess: z.boolean(),
      rawFeatures: z.array(baseFeatureSchema),
      ignoredFeatures: z.array(ignoredFeatureSchema),
      tokensUsed: tokensSchema,
      discoveredFeatures: z.array(featureSchema),
      docsCount: z.number(),
      totalFilters: z.number(),
      filtersCapped: z.boolean(),
      hasFilteredDocuments: z.boolean(),
      totalTokensUsed: tokensSchema.optional(),
      successCount: z.number().optional(),
      featureTtlDays: z.number().optional(),
    }),
  }),
  handler: async ({ params, request, getScopedClients, server, logger, telemetry }) => {
    const { featureClient, streamsClient, tuningConfig, licensing, uiSettingsClient } =
      await getScopedClients({ request });

    await assertSignificantEventsAccess({ server, licensing, uiSettingsClient });

    const { name: streamName } = params.path;
    const {
      runId,
      iteration,
      inferSuccess,
      rawFeatures,
      ignoredFeatures,
      tokensUsed,
      discoveredFeatures,
      docsCount,
      totalFilters,
      filtersCapped,
      hasFilteredDocuments,
      totalTokensUsed: prevTokens = { ...EMPTY_TOKENS },
      successCount: prevSuccessCount = 0,
      featureTtlDays = tuningConfig.feature_ttl_days,
    } = params.body;

    const taskLogger = logger.get('features_identification_workflow', streamName);

    const [stream, { hits: allFeatures }, { hits: excludedFeatures }] = await Promise.all([
      streamsClient.getStream(streamName),
      featureClient.getFeatures(streamName),
      featureClient.getExcludedFeatures(streamName),
    ]);
    const streamType = getStreamTypeFromDefinition(stream);
    const discoveredSet = new Set(discoveredFeatures.map((f) => f.uuid));
    const storedFeatures = allFeatures.filter(
      (f) => !isComputedFeature(f) && !discoveredSet.has(f.uuid)
    );

    if (!inferSuccess) {
      const failedResult: IterationResult = {
        iteration,
        durationMs: 0,
        state: 'failure',
        tokensUsed: { ...EMPTY_TOKENS },
        newFeatures: [],
        updatedFeatures: [],
      };

      telemetry.trackFeaturesIdentified({
        run_id: runId,
        iteration,
        stream_name: streamName,
        stream_type: streamType,
        state: 'failure',
        docs_count: docsCount,
        features_new: 0,
        features_updated: 0,
        input_tokens_used: 0,
        output_tokens_used: 0,
        total_tokens_used: 0,
        cached_tokens_used: 0,
        duration_ms: 0,
        excluded_features_count: excludedFeatures.length,
        llm_ignored_count: 0,
        code_ignored_count: 0,
        total_filters: totalFilters,
        filters_capped: filtersCapped,
        has_filtered_documents: hasFilteredDocuments,
      });

      return {
        discoveredFeatures,
        totalTokensUsed: prevTokens,
        successCount: prevSuccessCount,
        iterationResult: failedResult,
      };
    }

    const allKnownFeatures = [...storedFeatures, ...discoveredFeatures];
    const storedSet = new Set(storedFeatures.map((f) => f.uuid));

    const { newFeatures, updatedFeatures, codeIgnoredCount } = reconcileIterationFeatures({
      rawFeatures,
      allKnownFeatures,
      discoveredSet,
      storedSet,
      ignoredFeatures,
      excludedFeatures,
      featureTtlDays,
      logger: taskLogger,
    });

    const allChanged = [...newFeatures, ...updatedFeatures];
    if (allChanged.length > 0) {
      await featureClient.bulk(
        streamName,
        allChanged.map((feature) => ({ index: { feature } }))
      );
    }

    const discoveredMap = new Map(discoveredFeatures.map((f) => [f.uuid, f]));
    for (const feature of allChanged) {
      discoveredMap.set(feature.uuid, feature);
    }
    const nextDiscovered = Array.from(discoveredMap.values());

    const updatedTotalTokens = sumTokens(prevTokens, tokensUsed);

    const iterationResult: IterationResult = {
      iteration,
      durationMs: 0,
      state: 'success',
      tokensUsed,
      newFeatures: newFeatures.map(toFeatureSummary),
      updatedFeatures: updatedFeatures.map(toFeatureSummary),
    };

    telemetry.trackFeaturesIdentified({
      run_id: runId,
      iteration,
      stream_name: streamName,
      stream_type: streamType,
      state: 'success',
      docs_count: docsCount,
      features_new: newFeatures.length,
      features_updated: updatedFeatures.length,
      input_tokens_used: tokensUsed.prompt,
      output_tokens_used: tokensUsed.completion,
      total_tokens_used: tokensUsed.total,
      cached_tokens_used: tokensUsed.cached ?? 0,
      duration_ms: 0,
      excluded_features_count: excludedFeatures.length,
      llm_ignored_count: ignoredFeatures.length,
      code_ignored_count: codeIgnoredCount,
      total_filters: totalFilters,
      filters_capped: filtersCapped,
      has_filtered_documents: hasFilteredDocuments,
    });

    return {
      discoveredFeatures: nextDiscovered,
      totalTokensUsed: updatedTotalTokens,
      successCount: prevSuccessCount + 1,
      iterationResult,
    };
  },
});

// ---------------------------------------------------------------------------
// Step 5: Finalize — generate and persist computed KI features
// ---------------------------------------------------------------------------

const finalizeRoute = createServerRoute({
  endpoint: 'POST /internal/streams/{name}/features/_identify/finalize',
  options: {
    access: 'internal',
    summary: 'Generate computed KI features and finalize identification run',
  },
  security: {
    authz: {
      requiredPrivileges: [STREAMS_API_PRIVILEGES.manage],
    },
  },
  params: z.object({
    path: z.object({ name: z.string() }),
    body: z.object({
      start: z.number(),
      end: z.number(),
      iteration: z.number().optional(),
      successCount: z.number().optional(),
      featureTtlDays: z.number().optional(),
    }),
  }),
  handler: async ({ params, request, getScopedClients, server, logger }) => {
    const {
      scopedClusterClient,
      featureClient,
      streamsClient,
      tuningConfig,
      licensing,
      uiSettingsClient,
    } = await getScopedClients({ request });

    await assertSignificantEventsAccess({ server, licensing, uiSettingsClient });

    const { name: streamName } = params.path;
    const {
      start,
      end,
      iteration = 0,
      successCount = 0,
      featureTtlDays = tuningConfig.feature_ttl_days,
    } = params.body;
    const taskLogger = logger.get('features_identification_workflow', streamName);

    if (iteration > 0 && successCount === 0) {
      throw new Error(`All iterations failed for stream ${streamName}`);
    }
    const esClient = scopedClusterClient.asCurrentUser;

    const stream = await streamsClient.getStream(streamName);

    const computedFeatures = await generateAllComputedFeatures({
      stream,
      start,
      end,
      esClient,
      logger: taskLogger.get('computed_features'),
    });

    const reconciledComputedFeatures = reconcileComputedFeatures({
      computedFeatures,
      streamName,
      featureTtlDays,
    });

    if (reconciledComputedFeatures.length > 0) {
      await featureClient.bulk(
        streamName,
        reconciledComputedFeatures.map((feature) => ({ index: { feature } }))
      );
    }

    return {
      computedFeatures: reconciledComputedFeatures,
      computedFeaturesCount: reconciledComputedFeatures.length,
    };
  },
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function reconcileIterationFeatures({
  rawFeatures,
  allKnownFeatures,
  discoveredSet,
  storedSet,
  ignoredFeatures,
  excludedFeatures,
  featureTtlDays,
  logger: log,
}: {
  rawFeatures: BaseFeature[];
  allKnownFeatures: Feature[];
  discoveredSet: Set<string>;
  storedSet: Set<string>;
  ignoredFeatures: IgnoredFeature[];
  excludedFeatures: Feature[];
  featureTtlDays?: number;
  logger: { debug: (msg: string | (() => string)) => void };
}): { newFeatures: Feature[]; updatedFeatures: Feature[]; codeIgnoredCount: number } {
  const metadata = createFeatureMetadata(featureTtlDays);
  const newFeatures: Feature[] = [];
  const updatedFeatures: Feature[] = [];

  for (const ignored of ignoredFeatures) {
    log.debug(
      () =>
        `LLM ignored feature "${ignored.feature_id}" (matched excluded "${ignored.excluded_feature_id}"): ${ignored.reason}`
    );
  }

  let codeIgnoredCount = 0;
  const nonExcluded = rawFeatures.filter((feature) => {
    const matchingExcluded = excludedFeatures.find((excluded) =>
      isDuplicateFeature(feature, excluded)
    );
    if (matchingExcluded) {
      codeIgnoredCount++;
      log.debug(
        () =>
          `Dropping inferred feature [${feature.id}] because it matches excluded feature [${matchingExcluded.id}]`
      );
      return false;
    }
    return true;
  });

  const byLowerId = new Map<string, Feature>();
  for (const f of allKnownFeatures) {
    byLowerId.set(f.id.toLowerCase(), f);
  }

  for (const raw of nonExcluded) {
    const match =
      byLowerId.get(raw.id.toLowerCase()) ??
      allKnownFeatures.find((f) => isDuplicateFeature(f, raw));

    if (match) {
      if (storedSet.has(match.uuid) && !discoveredSet.has(match.uuid)) {
        updatedFeatures.push({ ...raw, ...metadata, uuid: match.uuid });
      } else {
        const merged = mergeFeature(match, raw);
        if (!isEqual(merged, toBaseFeature(match))) {
          updatedFeatures.push({ ...merged, ...metadata, uuid: match.uuid });
        }
      }
    } else {
      newFeatures.push({ ...raw, ...metadata, uuid: uuid() });
    }
  }

  return { newFeatures, updatedFeatures, codeIgnoredCount };
}

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

export const identifyRoutes = {
  ...setupRoute,
  ...sampleRoute,
  ...inferRoute,
  ...reconcileRoute,
  ...finalizeRoute,
};
