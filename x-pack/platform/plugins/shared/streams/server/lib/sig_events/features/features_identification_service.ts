/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEqual } from 'lodash';
import { v4 as uuid, v5 as uuidv5 } from 'uuid';
import type { ElasticsearchClient } from '@kbn/core/server';
import type { SavedObjectsClientContract } from '@kbn/core-saved-objects-api-server';
import type { Logger } from '@kbn/logging';
import type { BoundInferenceClient, ChatCompletionTokenCount } from '@kbn/inference-common';
import type { StreamType } from '@kbn/streams-schema';
import {
  type Feature,
  type BaseFeature,
  type IterationResult,
  type Streams,
  isComputedFeature,
  isFeatureWithFilter,
  isDuplicateFeature,
  hasSameFingerprint,
  mergeFeature,
  toBaseFeature,
} from '@kbn/streams-schema';
import {
  identifyFeatures,
  generateAllComputedFeatures,
  sumTokens,
  type ExcludedFeatureSummary,
  type IgnoredFeature,
} from '@kbn/streams-ai';
import type { FeatureClient } from '../../streams/feature/feature_client';
import { fetchSampleDocuments } from '../../tasks/task_definitions/features_identification/fetch_sample_documents';
import { PromptsConfigService } from '../saved_objects/prompts_config_service';
import type { SigEventsTuningConfig } from '../../../../common/sig_events_tuning_config';
import { DEFAULT_SIG_EVENTS_TUNING_CONFIG } from '../../../../common/sig_events_tuning_config';

export const MS_PER_DAY = 24 * 60 * 60 * 1000;
const DEFAULT_MAX_PREVIOUSLY_IDENTIFIED_FEATURES = 100;

export const EMPTY_TOKENS: ChatCompletionTokenCount = {
  prompt: 0,
  completion: 0,
  total: 0,
  cached: 0,
};

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

const toFeatureSummary = ({ id, title }: Feature) => ({ id, title: title ?? id });

const toFeatureProjection = ({ id, type, subtype, title, description, properties }: Feature) => ({
  id,
  type,
  subtype,
  title,
  description,
  properties,
});

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

// ---------------------------------------------------------------------------
// Tuning params type (subset of SigEventsTuningConfig)
// ---------------------------------------------------------------------------

type IterationTuningParams = Partial<
  Pick<
    SigEventsTuningConfig,
    | 'sample_size'
    | 'feature_ttl_days'
    | 'entity_filtered_ratio'
    | 'diverse_ratio'
    | 'max_excluded_features_in_prompt'
    | 'max_entity_filters'
  >
> & {
  maxPreviouslyIdentifiedFeatures?: number;
};

// ---------------------------------------------------------------------------
// Accumulated iteration state
// ---------------------------------------------------------------------------

export interface AccumulatedIterationState {
  discoveredFeatures: Feature[];
  iterationResults: IterationResult[];
}

export function createEmptyAccumulatedState(): AccumulatedIterationState {
  return {
    discoveredFeatures: [],
    iterationResults: [],
  };
}

export function deriveSuccessCount(results: IterationResult[]): number {
  return results.filter((r) => r.state === 'success').length;
}

export function deriveTotalTokensUsed(
  results: ReadonlyArray<{ tokensUsed: ChatCompletionTokenCount }>
): ChatCompletionTokenCount {
  return results.reduce((acc, r) => sumTokens(acc, r.tokensUsed), { ...EMPTY_TOKENS });
}

// ---------------------------------------------------------------------------
// Telemetry
// ---------------------------------------------------------------------------

export interface FeaturesIdentifiedTelemetry {
  run_id: string;
  iteration: number;
  stream_name: string;
  stream_type: StreamType;
  docs_count: number;
  excluded_features_count: number;
  total_filters: number;
  filters_capped: boolean;
  has_filtered_documents: boolean;
  duration_ms: number;
  state: 'success' | 'failure';
  features_new: number;
  features_updated: number;
  input_tokens_used: number;
  output_tokens_used: number;
  total_tokens_used: number;
  cached_tokens_used: number;
  llm_ignored_count: number;
  code_ignored_count: number;
}

interface TelemetryContext {
  run_id: string;
  iteration: number;
  stream_name: string;
  stream_type: StreamType;
  docs_count: number;
  excluded_features_count: number;
  total_filters: number;
  filters_capped: boolean;
  has_filtered_documents: boolean;
}

function buildTelemetry(
  ctx: TelemetryContext,
  durationMs: number,
  outcome:
    | { state: 'failure' }
    | {
        state: 'success';
        tokensUsed: ChatCompletionTokenCount;
        newCount: number;
        updatedCount: number;
        llmIgnoredCount: number;
        codeIgnoredCount: number;
      }
): FeaturesIdentifiedTelemetry {
  if (outcome.state === 'failure') {
    return {
      ...ctx,
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
    };
  }
  const { tokensUsed } = outcome;
  return {
    ...ctx,
    duration_ms: durationMs,
    state: 'success',
    features_new: outcome.newCount,
    features_updated: outcome.updatedCount,
    input_tokens_used: tokensUsed.prompt,
    output_tokens_used: tokensUsed.completion,
    total_tokens_used: tokensUsed.total,
    cached_tokens_used: tokensUsed.cached ?? 0,
    llm_ignored_count: outcome.llmIgnoredCount,
    code_ignored_count: outcome.codeIgnoredCount,
  };
}

// ---------------------------------------------------------------------------
// Computed features reconciliation
// ---------------------------------------------------------------------------

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
// Inferred features reconciliation
// ---------------------------------------------------------------------------

function reconcileInferredFeatures({
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
  discoveredSet: ReadonlySet<string>;
  storedSet: ReadonlySet<string>;
  ignoredFeatures: IgnoredFeature[];
  excludedFeatures: ReadonlyArray<Feature>;
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

  const excludedByLowerId = new Set(excludedFeatures.map((f) => f.id.toLowerCase()));

  let codeIgnoredCount = 0;
  const nonExcluded = rawFeatures.filter((feature) => {
    if (excludedByLowerId.has(feature.id.toLowerCase())) {
      codeIgnoredCount++;
      log.debug(() => `Dropping inferred feature [${feature.id}] matches excluded feature by ID`);
      return false;
    }
    const fingerprintMatch = excludedFeatures.find((excluded) =>
      hasSameFingerprint(feature, excluded)
    );
    if (fingerprintMatch) {
      codeIgnoredCount++;
      log.debug(
        () =>
          `Dropping inferred feature [${feature.id}] because it matches excluded feature [${fingerprintMatch.id}] by fingerprint`
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
  esClient: ElasticsearchClient;
  streamName: string;
  start: number;
  end: number;
  discoveredFeatures: Feature[];
  storedFeatures: Feature[];
  discoveredSet: ReadonlySet<string>;
  storedSet: ReadonlySet<string>;
  excludedFeatures: Feature[];
  inferenceClient: BoundInferenceClient;
  systemPrompt: string;
  logger: Logger;
  signal: AbortSignal;
  tuning: IterationTuningParams;
}

type InferredIterationResult =
  | { hasDocuments: false; docsCount: 0; docIds: [] }
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
            newFeatures: Feature[];
            updatedFeatures: Feature[];
            ignoredFeatures: IgnoredFeature[];
            codeIgnoredCount: number;
          };
    };

async function runInferredIteration({
  esClient,
  streamName,
  start,
  end,
  discoveredFeatures,
  storedFeatures,
  discoveredSet,
  storedSet,
  excludedFeatures,
  inferenceClient,
  systemPrompt,
  logger,
  signal,
  tuning,
}: RunInferredIterationOptions): Promise<InferredIterationResult> {
  const {
    sample_size: sampleSize = DEFAULT_SIG_EVENTS_TUNING_CONFIG.sample_size,
    entity_filtered_ratio:
      entityFilteredRatio = DEFAULT_SIG_EVENTS_TUNING_CONFIG.entity_filtered_ratio,
    diverse_ratio: diverseRatio = DEFAULT_SIG_EVENTS_TUNING_CONFIG.diverse_ratio,
    max_entity_filters: maxEntityFilters = DEFAULT_SIG_EVENTS_TUNING_CONFIG.max_entity_filters,
    max_excluded_features_in_prompt:
      maxExcludedFeaturesInPrompt = DEFAULT_SIG_EVENTS_TUNING_CONFIG.max_excluded_features_in_prompt,
    feature_ttl_days: featureTtlDays,
    maxPreviouslyIdentifiedFeatures = DEFAULT_MAX_PREVIOUSLY_IDENTIFIED_FEATURES,
  } = tuning;

  const batchResult = await fetchSampleDocuments({
    esClient,
    index: streamName,
    start,
    end,
    features: discoveredFeatures.filter(isFeatureWithFilter),
    logger,
    size: sampleSize,
    entityFilteredRatio,
    diverseRatio,
    maxEntityFilters,
  });

  if (batchResult.documents.length === 0) {
    return { hasDocuments: false, docsCount: 0, docIds: [] };
  }

  const { totalFilters, filtersCapped, hasFilteredDocuments } = batchResult;
  const docsCount = batchResult.documents.length;
  const docIds = batchResult.documents
    .map((doc) => doc._id)
    .filter((id): id is string => id != null);

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

  const { newFeatures, updatedFeatures, codeIgnoredCount } = reconcileInferredFeatures({
    rawFeatures,
    allKnownFeatures,
    discoveredSet,
    storedSet,
    ignoredFeatures,
    excludedFeatures,
    featureTtlDays,
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
    },
  };
}

// ---------------------------------------------------------------------------
// Top-level: Identify inferred features (one iteration, full handler)
// ---------------------------------------------------------------------------

export interface IdentifyInferredFeaturesOptions {
  esClient: ElasticsearchClient;
  featureClient: FeatureClient;
  soClient: SavedObjectsClientContract;
  inferenceClient: BoundInferenceClient;
  logger: Logger;
  signal: AbortSignal;
  streamName: string;
  streamType: StreamType;
  start: number;
  end: number;
  runId: string;
  state: AccumulatedIterationState;
  tuning?: IterationTuningParams;
  trackFeaturesIdentified?: (data: FeaturesIdentifiedTelemetry) => void;
}

export interface IdentifyInferredFeaturesResult {
  hasDocuments: boolean;
  docsCount: number;
  docIds: string[];
  iterationResult?: IterationResult;
  state: AccumulatedIterationState;
}

export async function identifyInferredFeatures({
  esClient,
  featureClient,
  soClient,
  inferenceClient,
  logger,
  signal,
  streamName,
  streamType,
  start,
  end,
  runId,
  state: prevState,
  tuning = {},
  trackFeaturesIdentified,
}: IdentifyInferredFeaturesOptions): Promise<IdentifyInferredFeaturesResult> {
  const iteration = prevState.iterationResults.length + 1;
  const [
    { hits: allFeatures },
    { hits: excludedFeatures },
    { featurePromptOverride: systemPrompt },
  ] = await Promise.all([
    featureClient.getFeatures(streamName),
    featureClient.getExcludedFeatures(streamName),
    new PromptsConfigService({ soClient, logger }).getPrompt(),
  ]);

  const startedAt = Date.now();

  const { discoveredFeatures } = prevState;
  const discoveredSet = new Set(discoveredFeatures.map((f) => f.uuid));
  const storedFeatures = allFeatures.filter(
    (f) => !isComputedFeature(f) && !discoveredSet.has(f.uuid)
  );
  const storedSet = new Set(storedFeatures.map((f) => f.uuid));

  const iterationResult = await runInferredIteration({
    esClient,
    streamName,
    start,
    end,
    discoveredFeatures,
    storedFeatures,
    discoveredSet,
    storedSet,
    excludedFeatures,
    inferenceClient,
    systemPrompt,
    logger,
    signal,
    tuning,
  });

  if (!iterationResult.hasDocuments) {
    return {
      hasDocuments: false,
      docsCount: 0,
      docIds: [],
      state: prevState,
    };
  }

  const { docsCount, docIds, totalFilters, filtersCapped, hasFilteredDocuments, outcome } =
    iterationResult;
  const elapsedMs = () => Date.now() - startedAt;

  const telemetryCtx: TelemetryContext = {
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

  if (outcome.state === 'failure') {
    const durationMs = elapsedMs();
    const failedResult: IterationResult = {
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
      iterationResult: failedResult,
      state: {
        discoveredFeatures: prevState.discoveredFeatures,
        iterationResults: [...prevState.iterationResults, failedResult],
      },
    };
  }

  const { tokensUsed, newFeatures, updatedFeatures, ignoredFeatures, codeIgnoredCount } = outcome;

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

  const durationMs = elapsedMs();
  const successResult: IterationResult = {
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
    })
  );

  return {
    hasDocuments: true,
    docsCount,
    docIds,
    iterationResult: successResult,
    state: {
      discoveredFeatures: nextDiscovered,
      iterationResults: [...prevState.iterationResults, successResult],
    },
  };
}

// ---------------------------------------------------------------------------
// Top-level: Identify computed features (full handler)
// ---------------------------------------------------------------------------

export interface IdentifyComputedFeaturesOptions {
  stream: Streams.all.Definition;
  streamName: string;
  start: number;
  end: number;
  esClient: ElasticsearchClient;
  featureClient: FeatureClient;
  logger: Logger;
  featureTtlDays?: number;
}

export async function identifyComputedFeatures({
  stream,
  streamName,
  start,
  end,
  esClient,
  featureClient,
  logger,
  featureTtlDays,
}: IdentifyComputedFeaturesOptions): Promise<Feature[]> {
  const computedFeatures = await generateAllComputedFeatures({
    stream,
    start,
    end,
    esClient,
    logger: logger.get('computed_features'),
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

  return reconciledComputedFeatures;
}
