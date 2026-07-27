/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import type { SavedObjectsClientContract } from '@kbn/core-saved-objects-api-server';
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
  normalizeFeatureSlugForMatching,
} from '@kbn/significant-events-schema';
import {
  EMPTY_TOKENS,
  identifyFeatures,
  type ExcludedFeatureSummary,
  type IgnoredFeature,
  type SearchSimilarFeaturesArguments,
  type SimilarFeatureHit,
} from '@kbn/streams-ai';
import {
  DEFAULT_SIGNIFICANT_EVENTS_TUNING_CONFIG,
  type SignificantEventsTuningConfig,
} from '@kbn/significant-events-schema';
import { PromptsConfigService } from '@kbn/streams-plugin/server';
import type { KnowledgeIndicatorClient } from '../../knowledge_indicators';
import { fetchSampleDocuments } from './fetch_sample_documents';

import {
  reconcileInferredFeatures,
  toFeatureSummary,
  toFeatureProjection,
} from './reconcile_features';

const DEFAULT_MAX_PREVIOUSLY_IDENTIFIED_FEATURES = 100;
const MAX_FEATURE_ALIASES = 10;

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

const getAliases = (meta: Record<string, unknown> | undefined): string[] => {
  const aliases = meta?.aliases;
  return Array.isArray(aliases)
    ? aliases
        .filter((alias): alias is string => typeof alias === 'string')
        .map(normalizeFeatureSlug)
        .filter((alias) => alias.length > 0)
    : [];
};

export interface SemanticFeatureSearchRecord {
  candidateId: string;
  type: string;
  hitIds: ReadonlySet<string>;
}

const getTypedFeatureId = (type: string, id: string): string =>
  `${type}:${normalizeFeatureSlug(id)}`;

const getTypedFeatureMatchingId = (type: string, id: string): string =>
  `${type}:${normalizeFeatureSlugForMatching(id)}`;

export const applySemanticFeatureAliases = (
  features: ReadonlyArray<BaseFeature>,
  searchRecords: ReadonlyArray<SemanticFeatureSearchRecord>
): { features: BaseFeature[]; reuseCount: number } => {
  let reuseCount = 0;
  const finalizedFeatureIds = new Set<string>();
  const featureIdsByMatchingId = new Map<string, Set<string>>();
  for (const feature of features) {
    const matchingId = getTypedFeatureMatchingId(feature.type, feature.id);
    const featureIds = featureIdsByMatchingId.get(matchingId) ?? new Set<string>();
    featureIds.add(getTypedFeatureId(feature.type, feature.id));
    featureIdsByMatchingId.set(matchingId, featureIds);
    finalizedFeatureIds.add(getTypedFeatureId(feature.type, feature.id));
  }
  const aliasesToAddByFeatureId = new Map<string, string[]>();

  for (const { candidateId, type, hitIds } of searchRecords) {
    const normalizedCandidateId = normalizeFeatureSlug(candidateId);
    if (normalizedCandidateId.length === 0) {
      continue;
    }

    const candidateFeatureId = getTypedFeatureId(type, candidateId);
    // The model emitted the candidate too, so nothing was abandoned — no alias.
    if (finalizedFeatureIds.has(candidateFeatureId)) {
      continue;
    }
    const reusedFeatureIds = new Set<string>();
    for (const hitId of hitIds) {
      const matchingFeatureIds = featureIdsByMatchingId.get(getTypedFeatureMatchingId(type, hitId));
      for (const matchingFeatureId of matchingFeatureIds ?? []) {
        if (matchingFeatureId !== candidateFeatureId) {
          reusedFeatureIds.add(matchingFeatureId);
        }
      }
    }
    // Save the alias only when the model reused exactly one search hit.
    if (reusedFeatureIds.size !== 1) {
      continue;
    }

    const reusedFeatureId = reusedFeatureIds.values().next().value;
    if (!reusedFeatureId) {
      continue;
    }
    const aliases = aliasesToAddByFeatureId.get(reusedFeatureId) ?? [];
    aliases.push(normalizedCandidateId);
    aliasesToAddByFeatureId.set(reusedFeatureId, aliases);
    reuseCount++;
  }

  const featuresWithAliases = features.map((feature) => {
    const aliasesToAdd = aliasesToAddByFeatureId.get(getTypedFeatureId(feature.type, feature.id));
    if (!aliasesToAdd || aliasesToAdd.length === 0) {
      return feature;
    }

    const aliases = Array.from(new Set([...getAliases(feature.meta), ...aliasesToAdd])).slice(
      -MAX_FEATURE_ALIASES
    );
    return {
      ...feature,
      meta: {
        ...(feature.meta ?? {}),
        aliases,
      },
    };
  });

  return { features: featuresWithAliases, reuseCount };
};

export const findSimilarFeatures = async ({
  kiClient,
  streamName,
  args,
}: {
  kiClient: Pick<KnowledgeIndicatorClient, 'findFeatures'>;
  streamName: string;
  args: SearchSimilarFeaturesArguments;
}): Promise<SimilarFeatureHit[]> => {
  // Fetch wide then filter: a 5-hit window shared across types can crowd out same-type hits.
  const { hits } = await kiClient.findFeatures(
    streamName,
    `${args.title} ${args.description}`.trim(),
    {
      searchMode: 'semantic',
      limit: 20,
    }
  );

  return hits
    .filter((feature) => feature.type === args.type)
    .slice(0, 5)
    .map((feature) => ({
      id: feature.id,
      title: feature.title ?? feature.id,
      description: feature.description,
      confidence: feature.confidence,
    }));
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
  semantic_verify_calls: number;
  semantic_verify_reuses: number;
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
        semanticVerifyCalls: number;
        semanticVerifyReuses: number;
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
      semantic_verify_calls: 0,
      semantic_verify_reuses: 0,
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
    semantic_verify_calls: outcome.semanticVerifyCalls,
    semantic_verify_reuses: outcome.semanticVerifyReuses,
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

// Aliases are code-owned matching keys, written only by applySemanticFeatureAliases after a
// verified reuse. The finalize schema leaves meta free-form, so drop whatever the model put there.
export const stripModelAssignedAliases = (feature: BaseFeature): BaseFeature => {
  if (!feature.meta || !('aliases' in feature.meta)) {
    return feature;
  }
  const { aliases, ...meta } = feature.meta;
  return { ...feature, meta: Object.keys(meta).length > 0 ? meta : undefined };
};

async function tryIdentifyFeatures(
  args: Parameters<typeof identifyFeatures>[0]
): Promise<InferenceResult> {
  try {
    const result = await identifyFeatures(args);
    return {
      success: true,
      rawFeatures: result.features.map(stripModelAssignedAliases),
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
  esClient: ElasticsearchClient;
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
  diverseOffset: number;
}

type InferredIterationResult =
  | { hasDocuments: false; nextDiverseOffset: number }
  | {
      hasDocuments: true;
      docsCount: number;
      docIds: string[];
      totalFilters: number;
      filtersCapped: boolean;
      hasFilteredDocuments: boolean;
      nextDiverseOffset: number;
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
            semanticVerifyCalls: number;
            semanticVerifyReuses: number;
          };
    };

async function runInferredIteration({
  esClient,
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
  diverseOffset,
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
    esClient,
    index: samplingSource,
    start,
    end,
    features: discoveredFeatures.filter(isFeatureWithFilter),
    logger,
    size: sampleSize,
    entityFilteredRatio,
    diverseRatio,
    maxEntityFilters,
    diverseOffset,
    samplingTimeoutMs,
  });

  if (batchResult.documents.length === 0) {
    return { hasDocuments: false, nextDiverseOffset: batchResult.nextOffset };
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
  const searchRecordsByCandidate = new Map<
    string,
    { candidateId: string; type: string; hitIds: Set<string> }
  >();
  let semanticVerifyCalls = 0;

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
    searchSimilarFeatures: async (args) => {
      semanticVerifyCalls++;
      const hits = await findSimilarFeatures({ kiClient, streamName, args });
      const recordKey = getTypedFeatureId(args.type, args.candidate_id);
      const searchRecord = searchRecordsByCandidate.get(recordKey) ?? {
        candidateId: args.candidate_id,
        type: args.type,
        hitIds: new Set<string>(),
      };
      for (const hit of hits) {
        searchRecord.hitIds.add(hit.id);
      }
      searchRecordsByCandidate.set(recordKey, searchRecord);
      return hits;
    },
  });

  if (!inferResult.success) {
    return {
      hasDocuments: true,
      docsCount,
      docIds,
      totalFilters,
      filtersCapped,
      hasFilteredDocuments,
      nextDiverseOffset: batchResult.nextOffset,
      outcome: { state: 'failure' },
    };
  }

  const { features: rawFeatures, reuseCount: semanticVerifyReuses } = applySemanticFeatureAliases(
    inferResult.rawFeatures,
    Array.from(searchRecordsByCandidate.values())
  );
  const { ignoredFeatures, tokensUsed } = inferResult;

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
    nextDiverseOffset: batchResult.nextOffset,
    outcome: {
      state: 'success',
      tokensUsed,
      newFeatures,
      updatedFeatures,
      ignoredFeatures,
      codeIgnoredCount,
      remappedCount,
      semanticVerifyCalls,
      semanticVerifyReuses,
    },
  };
}

// ---------------------------------------------------------------------------
// Top-level: Identify inferred features (one iteration, full handler)
// ---------------------------------------------------------------------------

export interface IdentifyInferredFeaturesOptions {
  esClient: ElasticsearchClient;
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
  diverseOffset?: number;
  trackFeaturesIdentified?: (data: FeaturesIdentifiedTelemetry) => void;
}

export interface IdentifyInferredFeaturesResult {
  hasDocuments: boolean;
  docsCount: number;
  docIds: string[];
  discoveredFeatures: FeatureUpsert[];
  iterationResult: IterationResult;
  nextDiverseOffset: number;
}

export async function identifyInferredFeatures({
  esClient,
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
  diverseOffset = 0,
  trackFeaturesIdentified,
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

  const startedAt = Date.now();

  const iterationResult = await runInferredIteration({
    esClient,
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
    diverseOffset,
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
      nextDiverseOffset: iterationResult.nextDiverseOffset,
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
      nextDiverseOffset: iterationResult.nextDiverseOffset,
    };
  }

  const {
    tokensUsed,
    newFeatures,
    updatedFeatures,
    ignoredFeatures,
    codeIgnoredCount,
    remappedCount,
    semanticVerifyCalls,
    semanticVerifyReuses,
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
      semanticVerifyCalls,
      semanticVerifyReuses,
    })
  );

  return {
    hasDocuments: true,
    docsCount,
    docIds,
    discoveredFeatures: Array.from(discoveredMap.values()),
    iterationResult: iterationEntry,
    nextDiverseOffset: iterationResult.nextDiverseOffset,
  };
}
