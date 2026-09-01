/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, KibanaRequest } from '@kbn/core/server';
import type { SavedObjectsClientContract } from '@kbn/core-saved-objects-api-server';
import type { ToolsStart } from '@kbn/agent-builder-server';
import type { Logger } from '@kbn/logging';
import type { BoundInferenceClient, ChatCompletionTokenCount } from '@kbn/inference-common';
import type { StreamType } from '@kbn/streams-schema';
import {
  type Feature,
  type FeatureUpsert,
  type BaseFeature,
  type IterationResult,
  isComputedFeature,
  isFeatureWithFilter,
  normalizeFeatureSlug,
} from '@kbn/significant-events-schema';
import {
  EMPTY_TOKENS,
  identifyFeatures,
  type ExcludedFeatureSummary,
  type IgnoredFeature,
} from '@kbn/streams-ai';
import {
  DEFAULT_SIGNIFICANT_EVENTS_TUNING_CONFIG,
  type SignificantEventsTuningConfig,
} from '@kbn/significant-events-schema';
import { PromptsConfigService } from '@kbn/streams-plugin/server';
import type { ToolCallback, ToolDefinition } from '@kbn/inference-common';
import { platformSignificantEventsTools } from '@kbn/agent-builder-common/tools';
import type { KnowledgeIndicatorClient } from '../../knowledge_indicators';
import { MemoryServiceImpl } from '../../../memory_and_investigation/lib/memory';
import { createMemoryDiscoveryTools, type MemoryDiscoveryTools } from '../memory_discovery_tools';
import {
  createKiExtractionContextTools,
  type KiExtractionContextTools,
} from '../ki_extraction_context_tools';
import { fetchSampleDocuments } from './fetch_sample_documents';

import {
  reconcileInferredFeatures,
  toFeatureSummary,
  toFeatureProjection,
} from './reconcile_features';
import { createInferenceToolsFromAgentBuilder } from '../../agent_builder/inference_tool_bridge';

export { findSimilarFeatures } from './feature_similarity_search';
import { buildFeatureSimilarityInferenceTools } from './feature_similarity_search';

const DEFAULT_MAX_PREVIOUSLY_IDENTIFIED_FEATURES = 100;

export const selectPreviouslyIdentifiedFeatures = (
  features: ReadonlyArray<Feature>,
  limit: number
): Feature[] => {
  const featuresByType = new Map<string, Feature[]>();
  for (const feature of features) {
    const featuresOfType = featuresByType.get(feature.type);
    if (featuresOfType) {
      featuresOfType.push(feature);
    } else {
      featuresByType.set(feature.type, [feature]);
    }
  }

  const rankedGroups = Array.from(featuresByType.entries())
    .sort(([typeA], [typeB]) => typeA.localeCompare(typeB))
    .map(([, featuresOfType]) =>
      featuresOfType.sort(
        (featureA, featureB) =>
          featureB.confidence - featureA.confidence ||
          normalizeFeatureSlug(featureA.id).localeCompare(normalizeFeatureSlug(featureB.id))
      )
    );
  const selected: Feature[] = [];
  const normalizedLimit = Math.max(0, Math.floor(limit));

  for (let rank = 0; selected.length < normalizedLimit; rank++) {
    let addedAtRank = false;
    for (const group of rankedGroups) {
      const feature = group[rank];
      if (feature) {
        selected.push(feature);
        addedAtRank = true;
        if (selected.length === normalizedLimit) {
          break;
        }
      }
    }
    if (!addedAtRank) {
      break;
    }
  }

  return selected;
};

// ~8k tokens. Worst real stream measured ~15k chars; the store allows up to 10k features
// x 255 chars, which would blow the prompt without a ceiling.
export const KNOWN_FEATURE_IDS_MAX_CHARS = 32_000;

export const buildKnownFeatureIds = (
  features: ReadonlyArray<BaseFeature & { updated_at?: string }>,
  maxChars: number = KNOWN_FEATURE_IDS_MAX_CHARS
): { text: string; droppedCount: number } => {
  // Newest first, so a budget cut drops the stalest ids.
  const byRecency = [...features].sort((a, b) =>
    (b.updated_at ?? '').localeCompare(a.updated_at ?? '')
  );

  const idsByType = new Map<string, Set<string>>();
  const seen = new Set<string>();
  let usedChars = 0;
  let budgetExceeded = false;
  let droppedCount = 0;

  for (const feature of byRecency) {
    const id = normalizeFeatureSlug(feature.id);
    if (id.length === 0) {
      continue;
    }
    const seenKey = `${feature.type}:${id}`;
    if (seen.has(seenKey)) {
      continue;
    }
    seen.add(seenKey);

    const ids = idsByType.get(feature.type);
    const cost = id.length + (ids ? 2 : feature.type.length + 3);
    if (budgetExceeded || usedChars + cost > maxChars) {
      budgetExceeded = true;
      droppedCount++;
      continue;
    }
    usedChars += cost;
    if (ids) {
      ids.add(id);
    } else {
      idsByType.set(feature.type, new Set([id]));
    }
  }

  const text = Array.from(idsByType.entries())
    .sort(([typeA], [typeB]) => typeA.localeCompare(typeB))
    .map(
      ([type, ids]) =>
        `${type}: ${Array.from(ids)
          .sort((idA, idB) => idA.localeCompare(idB))
          .join(', ')}`
    )
    .join('\n');

  return { text, droppedCount };
};

// ---------------------------------------------------------------------------
// Tuning params type (subset of SignificantEventsTuningConfig)
// ---------------------------------------------------------------------------

type IterationTuningParams = Partial<
  Pick<
    SignificantEventsTuningConfig,
    | 'sample_size'
    | 'entity_filtered_ratio'
    | 'diverse_ratio'
    | 'max_excluded_features_in_prompt'
    | 'max_entity_filters'
    | 'sampling_timeout_ms'
  >
> & {
  maxPreviouslyIdentifiedFeatures?: number;
};

// ---------------------------------------------------------------------------
// Telemetry
// ---------------------------------------------------------------------------

export interface FeaturesIdentifiedTelemetry {
  run_id: string;
  connector_id: string;
  iteration: number;
  stream_name: string;
  stream_type: StreamType;
  docs_count: number;
  excluded_features_count: number;
  total_filters: number;
  filters_capped: boolean;
  has_filtered_documents: boolean;
  duration_ms: number;
  state: 'success' | 'failure' | 'canceled';
  features_new: number;
  features_updated: number;
  features_remapped: number;
  input_tokens_used: number;
  output_tokens_used: number;
  total_tokens_used: number;
  cached_tokens_used: number;
  llm_ignored_count: number;
  code_ignored_count: number;
}

export interface TelemetryContext {
  run_id: string;
  connector_id: string;
  iteration: number;
  stream_name: string;
  stream_type: StreamType;
  docs_count: number;
  excluded_features_count: number;
  total_filters: number;
  filters_capped: boolean;
  has_filtered_documents: boolean;
}

export function buildTelemetry(
  ctx: TelemetryContext,
  durationMs: number,
  outcome:
    | { state: 'failure' | 'canceled' }
    | {
        state: 'success';
        tokensUsed: ChatCompletionTokenCount;
        newCount: number;
        updatedCount: number;
        llmIgnoredCount: number;
        codeIgnoredCount: number;
        remappedCount: number;
      }
): FeaturesIdentifiedTelemetry {
  if (outcome.state !== 'success') {
    return {
      ...ctx,
      duration_ms: durationMs,
      state: outcome.state,
      features_new: 0,
      features_updated: 0,
      features_remapped: 0,
      input_tokens_used: 0,
      output_tokens_used: 0,
      total_tokens_used: 0,
      cached_tokens_used: 0,
      llm_ignored_count: 0,
      code_ignored_count: 0,
    };
  }
  const { tokensUsed } = outcome;
  return {
    ...ctx,
    duration_ms: durationMs,
    state: 'success',
    features_new: outcome.newCount,
    features_updated: outcome.updatedCount,
    features_remapped: outcome.remappedCount,
    input_tokens_used: tokensUsed.prompt,
    output_tokens_used: tokensUsed.completion,
    total_tokens_used: tokensUsed.total,
    cached_tokens_used: tokensUsed.cached ?? 0,
    llm_ignored_count: outcome.llmIgnoredCount,
    code_ignored_count: outcome.codeIgnoredCount,
  };
}

// ---------------------------------------------------------------------------
// LLM inference wrapper
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
// Single inferred-features iteration (internal)
// ---------------------------------------------------------------------------

interface RunInferredIterationOptions {
  samplingEsClient: ElasticsearchClient;
  kiClient: KnowledgeIndicatorClient;
  streamName: string;
  samplingSource: string;
  start: number;
  end: number;
  runId: string;
  allFeatures: Feature[];
  discoveredFeatures: Feature[];
  excludedFeatures: Feature[];
  inferenceClient: BoundInferenceClient;
  systemPrompt: string;
  logger: Logger;
  signal: AbortSignal;
  tuning: IterationTuningParams;
  iteration: number;
  additionalTools?: Record<string, ToolDefinition>;
  additionalToolCallbacks?: Record<string, ToolCallback>;
}

type InferredIterationResult =
  | { hasDocuments: false }
  | {
      hasDocuments: true;
      docsCount: number;
      docIds: string[];
      totalFilters: number;
      filtersCapped: boolean;
      hasFilteredDocuments: boolean;
      outcome:
        | { state: 'failure' }
        | {
            state: 'success';
            tokensUsed: ChatCompletionTokenCount;
            newFeatures: FeatureUpsert[];
            updatedFeatures: FeatureUpsert[];
            ignoredFeatures: IgnoredFeature[];
            codeIgnoredCount: number;
            remappedCount: number;
          };
    };

async function runInferredIteration({
  samplingEsClient,
  kiClient,
  streamName,
  samplingSource,
  start,
  end,
  runId,
  allFeatures,
  discoveredFeatures,
  excludedFeatures,
  inferenceClient,
  systemPrompt,
  logger,
  signal,
  tuning,
  iteration,
  additionalTools,
  additionalToolCallbacks,
}: RunInferredIterationOptions): Promise<InferredIterationResult> {
  const {
    sample_size: sampleSize = DEFAULT_SIGNIFICANT_EVENTS_TUNING_CONFIG.sample_size,
    entity_filtered_ratio:
      entityFilteredRatio = DEFAULT_SIGNIFICANT_EVENTS_TUNING_CONFIG.entity_filtered_ratio,
    diverse_ratio: diverseRatio = DEFAULT_SIGNIFICANT_EVENTS_TUNING_CONFIG.diverse_ratio,
    max_entity_filters:
      maxEntityFilters = DEFAULT_SIGNIFICANT_EVENTS_TUNING_CONFIG.max_entity_filters,
    max_excluded_features_in_prompt:
      maxExcludedFeaturesInPrompt = DEFAULT_SIGNIFICANT_EVENTS_TUNING_CONFIG.max_excluded_features_in_prompt,
    sampling_timeout_ms:
      samplingTimeoutMs = DEFAULT_SIGNIFICANT_EVENTS_TUNING_CONFIG.sampling_timeout_ms,
    maxPreviouslyIdentifiedFeatures = DEFAULT_MAX_PREVIOUSLY_IDENTIFIED_FEATURES,
  } = tuning;

  const batchResult = await fetchSampleDocuments({
    esClient: samplingEsClient,
    index: samplingSource,
    start,
    end,
    features: discoveredFeatures.filter(isFeatureWithFilter),
    logger,
    size: sampleSize,
    entityFilteredRatio,
    diverseRatio,
    maxEntityFilters,
    iteration,
    samplingTimeoutMs,
  });

  if (batchResult.documents.length === 0) {
    return { hasDocuments: false };
  }

  const { totalFilters, filtersCapped, hasFilteredDocuments } = batchResult;
  const docsCount = batchResult.documents.length;
  const docIds = batchResult.documents
    .map((doc) => doc._id)
    .filter((id): id is string => id != null);

  const allKnownFeatures = allFeatures.filter((f) => !isComputedFeature(f));
  const topRanked = selectPreviouslyIdentifiedFeatures(
    allKnownFeatures,
    maxPreviouslyIdentifiedFeatures
  );
  const { text: knownFeatureIds, droppedCount: knownFeatureIdsDropped } =
    buildKnownFeatureIds(allKnownFeatures);
  if (knownFeatureIdsDropped > 0) {
    logger.debug(
      `known_feature_ids inventory for stream "${streamName}" exceeded its budget; dropped the ${knownFeatureIdsDropped} stalest ids`
    );
  }
  const excludedSummaries: ExcludedFeatureSummary[] = excludedFeatures
    .slice(0, maxExcludedFeaturesInPrompt)
    .map(toFeatureProjection);

  const inferResult = await tryIdentifyFeatures({
    streamName,
    sampleDocuments: batchResult.documents,
    excludedFeatures: excludedSummaries,
    inferenceClient,
    systemPrompt,
    logger,
    signal,
    previouslyIdentifiedFeatures: topRanked.map(toFeatureProjection),
    knownFeatureIds,
    additionalTools,
    additionalToolCallbacks,
  });

  if (!inferResult.success) {
    return {
      hasDocuments: true,
      docsCount,
      docIds,
      totalFilters,
      filtersCapped,
      hasFilteredDocuments,
      outcome: { state: 'failure' },
    };
  }

  const { rawFeatures, ignoredFeatures, tokensUsed } = inferResult;

  const { newFeatures, updatedFeatures, codeIgnoredCount, remappedCount } =
    reconcileInferredFeatures({
      rawFeatures,
      allKnownFeatures,
      discoveredFeatures,
      ignoredFeatures,
      excludedFeatures,
      runId,
      logger,
    });

  return {
    hasDocuments: true,
    docsCount,
    docIds,
    totalFilters,
    filtersCapped,
    hasFilteredDocuments,
    outcome: {
      state: 'success',
      tokensUsed,
      newFeatures,
      updatedFeatures,
      ignoredFeatures,
      codeIgnoredCount,
      remappedCount,
    },
  };
}

// ---------------------------------------------------------------------------
// Top-level: Identify inferred features (one iteration, full handler)
// ---------------------------------------------------------------------------

export interface IdentifyInferredFeaturesOptions {
  esClient: ElasticsearchClient;
  /**
   * Client used to sample documents from `samplingSource`. Separate from `esClient` because the
   * sampling source can live on a remote CPS-connected project, while `esClient` reads the
   * plugin's own (origin-only) indices.
   */
  samplingEsClient: ElasticsearchClient;
  kiClient: KnowledgeIndicatorClient;
  soClient: SavedObjectsClientContract;
  inferenceClient: BoundInferenceClient;
  connectorId: string;
  logger: Logger;
  signal: AbortSignal;
  streamName: string;
  samplingSource: string;
  streamType: StreamType;
  start: number;
  end: number;
  runId: string;
  iteration?: number;
  tuning?: IterationTuningParams;
  trackFeaturesIdentified?: (data: FeaturesIdentifiedTelemetry) => void;
  agentBuilderTools?: ToolsStart;
  request?: KibanaRequest;
}

export interface IdentifyInferredFeaturesResult {
  hasDocuments: boolean;
  docsCount: number;
  docIds: string[];
  discoveredFeatures: FeatureUpsert[];
  iterationResult: IterationResult;
}

export async function identifyInferredFeatures({
  esClient,
  samplingEsClient,
  kiClient,
  soClient,
  inferenceClient,
  connectorId,
  logger,
  signal,
  streamName,
  samplingSource,
  streamType,
  start,
  end,
  runId,
  iteration = 1,
  tuning = {},
  trackFeaturesIdentified,
  agentBuilderTools,
  request,
}: IdentifyInferredFeaturesOptions): Promise<IdentifyInferredFeaturesResult> {
  const [
    { hits: allFeatures },
    { hits: excludedFeatures },
    { featurePromptOverride: systemPrompt },
  ] = await Promise.all([
    kiClient.getFeatures(streamName),
    kiClient.getExcludedFeatures(streamName),
    new PromptsConfigService({ soClient, logger }).getPrompt(),
  ]);

  const discoveredFeatures = allFeatures.filter((f) => !isComputedFeature(f) && f.run_id === runId);

  // Expose read-only grounding tools to feature extraction so it can anchor new
  // KI features in durable prior knowledge:
  // - memory: prior learnings, known-benign patterns, past false positives.
  // - significant_event_search: prior Significant Events (already-tracked /
  //   demoted patterns). Only available when Agent Builder tools are wired.
  const memoryTools = createMemoryDiscoveryTools({
    memoryService: new MemoryServiceImpl({ logger: logger.get('memory'), esClient }),
  });

  const kiExtractionContextTools =
    agentBuilderTools && request
      ? await createKiExtractionContextTools({
          agentBuilderTools,
          request,
          logger: logger.get('ki_extraction_context'),
        })
      : undefined;

  const groundingToolsets = [memoryTools, kiExtractionContextTools].filter(
    (toolset): toolset is MemoryDiscoveryTools | KiExtractionContextTools => toolset !== undefined
  );

  // Bridge the managed Agent Builder tool when available (single schema source; stream_name injected
  // server-side), else a direct KI-client fallback so dedup still works without Agent Builder.
  const searchTools =
    agentBuilderTools && request
      ? await createInferenceToolsFromAgentBuilder({
          tools: agentBuilderTools,
          request,
          specs: [
            {
              sourceToolId: platformSignificantEventsTools.searchSimilarFeatures,
              name: 'search_similar_features',
              hiddenParams: ['stream_name'],
              prepare: () => ({ params: { stream_name: streamName } }),
            },
          ],
          logger: logger.get('feature_similarity_search'),
        })
      : buildFeatureSimilarityInferenceTools({ kiClient, streamName });

  const additionalTools: Record<string, ToolDefinition> = Object.assign(
    {},
    ...groundingToolsets.map((toolset) => toolset.tools),
    searchTools.tools
  );
  const additionalToolCallbacks: Record<string, ToolCallback> = Object.assign(
    {},
    ...groundingToolsets.map((toolset) => toolset.callbacks),
    searchTools.callbacks
  );
  const combinedSystemPrompt = groundingToolsets.reduce(
    (prompt, toolset) => `${prompt}\n${toolset.promptSnippet}`,
    systemPrompt
  );

  const startedAt = Date.now();

  const iterationResult = await runInferredIteration({
    samplingEsClient,
    kiClient,
    streamName,
    samplingSource,
    start,
    end,
    runId,
    allFeatures,
    discoveredFeatures,
    excludedFeatures,
    inferenceClient,
    systemPrompt: combinedSystemPrompt,
    logger,
    signal,
    tuning,
    iteration,
    additionalTools,
    additionalToolCallbacks,
  });

  if (!iterationResult.hasDocuments) {
    return {
      hasDocuments: false,
      docsCount: 0,
      docIds: [],
      discoveredFeatures,
      iterationResult: {
        runId,
        iteration,
        durationMs: Date.now() - startedAt,
        state: 'success',
        tokensUsed: { ...EMPTY_TOKENS },
        newFeatures: [],
        updatedFeatures: [],
      },
    };
  }

  const { docsCount, docIds, totalFilters, filtersCapped, hasFilteredDocuments, outcome } =
    iterationResult;

  const durationMs = Date.now() - startedAt;

  const telemetryCtx: TelemetryContext = {
    run_id: runId,
    connector_id: connectorId,
    iteration,
    stream_name: streamName,
    stream_type: streamType,
    docs_count: docsCount,
    excluded_features_count: excludedFeatures.length,
    total_filters: totalFilters,
    filters_capped: filtersCapped,
    has_filtered_documents: hasFilteredDocuments,
  };

  if (outcome.state !== 'success') {
    const failedEntry: IterationResult = {
      runId,
      iteration,
      durationMs,
      state: 'failure',
      tokensUsed: { ...EMPTY_TOKENS },
      newFeatures: [],
      updatedFeatures: [],
    };

    trackFeaturesIdentified?.(buildTelemetry(telemetryCtx, durationMs, { state: 'failure' }));

    return {
      hasDocuments: true,
      docsCount,
      docIds,
      discoveredFeatures,
      iterationResult: failedEntry,
    };
  }

  const {
    tokensUsed,
    newFeatures,
    updatedFeatures,
    ignoredFeatures,
    codeIgnoredCount,
    remappedCount,
  } = outcome;

  if (signal.aborted) {
    throw signal.reason instanceof Error ? signal.reason : new Error('Request was aborted');
  }
  const allChanged = [...newFeatures, ...updatedFeatures];
  if (allChanged.length > 0) {
    const priorBySlug = new Map(allFeatures.map((f) => [normalizeFeatureSlug(f.id), f]));
    await kiClient.bulk(
      streamName,
      allChanged.map((feature) => {
        const prior = priorBySlug.get(normalizeFeatureSlug(feature.id));
        const expiresAt = !prior || prior.expires_at ? kiClient.getDefaultExpiresAt() : undefined;
        return { index: { feature: { ...feature, expires_at: expiresAt } } };
      })
    );
  }

  const discoveredMap = new Map<string, FeatureUpsert>(discoveredFeatures.map((f) => [f.id, f]));
  for (const feature of allChanged) {
    discoveredMap.set(feature.id, feature);
  }

  const iterationEntry: IterationResult = {
    runId,
    iteration,
    durationMs,
    state: 'success',
    tokensUsed,
    newFeatures: newFeatures.map(toFeatureSummary),
    updatedFeatures: updatedFeatures.map(toFeatureSummary),
  };

  trackFeaturesIdentified?.(
    buildTelemetry(telemetryCtx, durationMs, {
      state: 'success',
      tokensUsed,
      newCount: newFeatures.length,
      updatedCount: updatedFeatures.length,
      llmIgnoredCount: ignoredFeatures.length,
      codeIgnoredCount,
      remappedCount,
    })
  );

  return {
    hasDocuments: true,
    docsCount,
    docIds,
    discoveredFeatures: Array.from(discoveredMap.values()),
    iterationResult: iterationEntry,
  };
}
