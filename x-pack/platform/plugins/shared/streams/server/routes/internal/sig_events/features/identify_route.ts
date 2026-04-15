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
import {
  tokensSchema,
  iterationResultSchema,
} from '../../../utils/workflow_execution_to_task_result';

const EMPTY_TOKENS: ChatCompletionTokenCount = { prompt: 0, completion: 0, total: 0, cached: 0 };
const DEFAULT_MAX_PREVIOUSLY_IDENTIFIED_FEATURES = 100;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

const toFeatureSummary = ({ id, title }: Feature) => ({ id, title: title ?? id });

function createFeatureMetadata(
  featureTtlDays: number = DEFAULT_SIG_EVENTS_TUNING_CONFIG.feature_ttl_days
) {
  const now = Date.now();
  return {
    status: 'active' as const,
    last_seen: new Date(now).toISOString(),
    expires_at: new Date(now + featureTtlDays * MS_PER_DAY).toISOString(),
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
// Inference helper — wraps identifyFeatures, catches LLM errors
// ---------------------------------------------------------------------------

type InferenceResult =
  | {
      success: true;
      rawFeatures: BaseFeature[];
      ignoredFeatures: IgnoredFeature[];
      tokensUsed: ChatCompletionTokenCount;
    }
  | { success: false };

async function tryIdentifyFeatures(
  args: Parameters<typeof identifyFeatures>[0]
): Promise<InferenceResult> {
  try {
    const result = await identifyFeatures(args);
    return {
      success: true,
      rawFeatures: result.features,
      ignoredFeatures: result.ignoredFeatures,
      tokensUsed: result.tokensUsed,
    };
  } catch (error) {
    if (args.signal.aborted) {
      throw error;
    }
    const errorMsg = error instanceof Error ? error.message : String(error);
    args.logger.warn(`LLM inference failed: ${errorMsg}`);
    return { success: false };
  }
}

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
    const startedAt = Date.now();
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
      maxPreviouslyIdentifiedFeatures = DEFAULT_MAX_PREVIOUSLY_IDENTIFIED_FEATURES,
      totalTokensUsed: prevTokens = { ...EMPTY_TOKENS },
      successCount: prevSuccessCount = 0,
      iterationResults: prevIterationResults = [],
    } = params.body;

    const taskLogger = logger.get('features_identification_workflow', streamName);

    // --- Setup: resolve connector, validate stream, start feature client creation ---
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
    const streamType = getStreamTypeFromDefinition(stream);
    const esClient = scopedClusterClient.asCurrentUser;

    const featureClientPromise = getFeatureClient();

    // --- Sample documents ---
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

    if (batchResult.documents.length === 0) {
      return {
        hasDocuments: false,
        discoveredFeatures,
        docsCount: 0,
        docIds: [],
        totalTokensUsed: prevTokens,
        successCount: prevSuccessCount,
        iterationResults: prevIterationResults,
      };
    }

    const docsCount = batchResult.documents.length;
    const docIds = batchResult.documents
      .map((doc) => doc._id)
      .filter((id): id is string => id != null);
    const { totalFilters, filtersCapped, hasFilteredDocuments } = batchResult;

    // --- Infer features via LLM ---
    const featureClient = await featureClientPromise;
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

    const discoveredSet = new Set(discoveredFeatures.map((f) => f.uuid));
    const storedFeatures = allFeatures.filter(
      (f) => !isComputedFeature(f) && !discoveredSet.has(f.uuid)
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

    const inferResult = await tryIdentifyFeatures({
      streamName,
      sampleDocuments: batchResult.documents,
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

    // --- Reconcile ---
    const elapsedMs = () => Date.now() - startedAt;

    const baseTelemetry = {
      run_id: runId,
      iteration,
      stream_name: streamName,
      stream_type: streamType,
      docs_count: docsCount,
      excluded_features_count: excludedFeatures.length,
      total_filters: totalFilters,
      filters_capped: filtersCapped,
      has_filtered_documents: hasFilteredDocuments,
    };

    if (!inferResult.success) {
      const durationMs = elapsedMs();
      const failedResult: IterationResult = {
        iteration,
        durationMs,
        state: 'failure',
        tokensUsed: { ...EMPTY_TOKENS },
        newFeatures: [],
        updatedFeatures: [],
      };

      telemetry.trackFeaturesIdentified({
        ...baseTelemetry,
        duration_ms: durationMs,
        state: 'failure',
        features_new: 0,
        features_updated: 0,
        input_tokens_used: 0,
        output_tokens_used: 0,
        total_tokens_used: 0,
        cached_tokens_used: 0,
        llm_ignored_count: 0,
        code_ignored_count: 0,
      });

      return {
        hasDocuments: true,
        discoveredFeatures,
        docsCount,
        docIds,
        totalTokensUsed: prevTokens,
        successCount: prevSuccessCount,
        iterationResult: failedResult,
        iterationResults: [...prevIterationResults, failedResult],
      };
    }

    const { rawFeatures, ignoredFeatures, tokensUsed } = inferResult;
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

    const durationMs = elapsedMs();
    const iterationResult: IterationResult = {
      iteration,
      durationMs,
      state: 'success',
      tokensUsed,
      newFeatures: newFeatures.map(toFeatureSummary),
      updatedFeatures: updatedFeatures.map(toFeatureSummary),
    };

    telemetry.trackFeaturesIdentified({
      ...baseTelemetry,
      duration_ms: durationMs,
      state: 'success',
      features_new: newFeatures.length,
      features_updated: updatedFeatures.length,
      input_tokens_used: tokensUsed.prompt,
      output_tokens_used: tokensUsed.completion,
      total_tokens_used: tokensUsed.total,
      cached_tokens_used: tokensUsed.cached ?? 0,
      llm_ignored_count: ignoredFeatures.length,
      code_ignored_count: codeIgnoredCount,
    });

    return {
      hasDocuments: true,
      discoveredFeatures: nextDiscovered,
      docsCount,
      docIds,
      totalTokensUsed: updatedTotalTokens,
      successCount: prevSuccessCount + 1,
      iterationResult,
      iterationResults: [...prevIterationResults, iterationResult],
    };
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

    const featureClient = await getFeatureClient();
    const { name: streamName } = params.path;
    const now = Date.now();
    const {
      start = now - MS_PER_DAY,
      end = now,
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
  ...identifyInferredFeaturesRoute,
  ...identifyComputedFeaturesRoute,
};
