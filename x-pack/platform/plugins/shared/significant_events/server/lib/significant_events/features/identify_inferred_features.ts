/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, KibanaRequest } from '@kbn/core/server';
import type { AgentBuilderPluginStart } from '@kbn/agent-builder-server';
import type { Logger } from '@kbn/logging';
import type { ChatCompletionTokenCount } from '@kbn/inference-common';
import type { StreamType } from '@kbn/streams-schema';
import {
  type Feature,
  type FeatureUpsert,
  type BaseFeature,
  type IterationResult,
  isComputedFeature,
  normalizeFeatureSlug,
} from '@kbn/significant-events-schema';
import {
  EMPTY_TOKENS,
  type InferenceDocument,
  type ExcludedFeatureSummary,
  type IgnoredFeature,
} from '@kbn/streams-ai';
import {
  DEFAULT_SIGNIFICANT_EVENTS_TUNING_CONFIG,
  type SignificantEventsTuningConfig,
} from '@kbn/significant-events-schema';
import type { KnowledgeIndicatorClient } from '../../knowledge_indicators';
import {
  reconcileInferredFeatures,
  toFeatureSummary,
  toFeatureProjection,
} from './reconcile_features';
import { executeFeatureIdentificationAgent } from './identify_features_via_agent';
import { FeatureNotEnabledError } from '../../errors/feature_not_enabled_error';

export { findSimilarFeatures } from './feature_similarity_search';

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
  Pick<SignificantEventsTuningConfig, 'max_excluded_features_in_prompt'>
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
// Single inferred-features iteration (internal)
// ---------------------------------------------------------------------------

interface RunInferredIterationOptions {
  kiClient: KnowledgeIndicatorClient;
  streamName: string;
  runId: string;
  allFeatures: Feature[];
  discoveredFeatures: Feature[];
  excludedFeatures: Feature[];
  documents: InferenceDocument[];
  totalFilters: number;
  filtersCapped: boolean;
  hasFilteredDocuments: boolean;
  agentBuilder: AgentBuilderPluginStart;
  request: KibanaRequest;
  connectorId: string;
  logger: Logger;
  signal: AbortSignal;
  tuning: IterationTuningParams;
  iteration: number;
}

interface InferredIterationResult {
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
}

async function runInferredIteration({
  kiClient,
  streamName,
  runId,
  allFeatures,
  discoveredFeatures,
  excludedFeatures,
  documents,
  totalFilters,
  filtersCapped,
  hasFilteredDocuments,
  agentBuilder,
  request,
  connectorId,
  logger,
  signal,
  tuning,
  iteration,
}: RunInferredIterationOptions): Promise<InferredIterationResult> {
  const {
    max_excluded_features_in_prompt:
      maxExcludedFeaturesInPrompt = DEFAULT_SIGNIFICANT_EVENTS_TUNING_CONFIG.max_excluded_features_in_prompt,
    maxPreviouslyIdentifiedFeatures = DEFAULT_MAX_PREVIOUSLY_IDENTIFIED_FEATURES,
  } = tuning;

  const docsCount = documents.length;
  const docIds = documents.map((doc) => doc._id).filter((id): id is string => id != null);

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

  let rawFeatures: BaseFeature[];
  let ignoredFeatures: IgnoredFeature[];
  let tokensUsed: ChatCompletionTokenCount;

  try {
    const result = await executeFeatureIdentificationAgent({
      agentBuilder,
      request,
      connectorId,
      streamName,
      sampleDocuments: documents,
      excludedFeatures: excludedSummaries,
      previouslyIdentifiedFeatures: topRanked.map(toFeatureProjection),
      knownFeatureIds,
      signal,
      logger,
    });
    rawFeatures = result.features;
    ignoredFeatures = result.ignoredFeatures;
    tokensUsed = result.tokensUsed;
  } catch (error) {
    if (signal.aborted) {
      throw error;
    }
    const errorMsg = error instanceof Error ? error.message : String(error);
    logger.warn(`Feature identification agent failed: ${errorMsg}`);
    return {
      docsCount,
      docIds,
      totalFilters,
      filtersCapped,
      hasFilteredDocuments,
      outcome: { state: 'failure' },
    };
  }

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
  kiClient: KnowledgeIndicatorClient;
  agentBuilder?: AgentBuilderPluginStart;
  request: KibanaRequest;
  connectorId: string;
  logger: Logger;
  signal: AbortSignal;
  streamName: string;
  streamType: StreamType;
  runId: string;
  documents: InferenceDocument[];
  totalFilters: number;
  filtersCapped: boolean;
  hasFilteredDocuments: boolean;
  iteration?: number;
  tuning?: IterationTuningParams;
  trackFeaturesIdentified?: (data: FeaturesIdentifiedTelemetry) => void;
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
  kiClient,
  agentBuilder,
  request,
  connectorId,
  logger,
  signal,
  streamName,
  streamType,
  runId,
  documents,
  totalFilters,
  filtersCapped,
  hasFilteredDocuments,
  iteration = 1,
  tuning = {},
  trackFeaturesIdentified,
}: IdentifyInferredFeaturesOptions): Promise<IdentifyInferredFeaturesResult> {
  if (!agentBuilder) {
    throw new FeatureNotEnabledError(
      'Feature identification requires Agent Builder, which is not available'
    );
  }

  const [{ hits: allFeatures }, { hits: excludedFeatures }] = await Promise.all([
    kiClient.getFeatures(streamName),
    kiClient.getExcludedFeatures(streamName),
  ]);

  const discoveredFeatures = allFeatures.filter((f) => !isComputedFeature(f) && f.run_id === runId);

  const startedAt = Date.now();

  const iterationResult = await runInferredIteration({
    kiClient,
    streamName,
    runId,
    allFeatures,
    discoveredFeatures,
    excludedFeatures,
    documents,
    totalFilters,
    filtersCapped,
    hasFilteredDocuments,
    agentBuilder,
    request,
    connectorId,
    logger,
    signal,
    tuning,
    iteration,
  });

  const { docsCount, docIds, outcome } = iterationResult;

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
