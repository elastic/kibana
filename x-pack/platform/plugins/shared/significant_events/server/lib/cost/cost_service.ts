/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import { SIGNIFICANT_EVENTS_INFERENCE_PARENT_FEATURE_ID } from '@kbn/significant-events-schema';
import {
  COST_BUDGET_GROUPS,
  FEATURE_ID_TO_COST_BUDGET_GROUP,
  type BudgetGroupCost,
  type CostBudgetGroup,
  type CostCaveat,
  type CostResponse,
  type CostStatus,
  type CostUnavailableReason,
  type PeriodCost,
  type TokenTrackingCoverage,
} from '../../../common/cost';
import { resolveDailyWindow } from '../run_quotas';
import type { PriceMap } from './price_service';

const TOKEN_USAGE_INDEX = '.kibana-inference-token-usage';
const MODELS_TERMS_SIZE = 20;
const TOKENS_PER_MILLION = 1_000_000;

const ALWAYS_PRESENT_CAVEATS: readonly CostCaveat[] = [
  'eis_pricing_assumed',
  'usd_assumed',
  'excludes_embeddings',
  'excludes_failed_calls',
  'excludes_cache_writes',
];

const STATUS_RANK: Record<CostStatus, number> = {
  complete: 0,
  partial: 1,
  unavailable: 2,
};

const KNOWN_FEATURE_IDS = Object.keys(FEATURE_ID_TO_COST_BUDGET_GROUP);

interface GroupAccumulator {
  totalTokens: number;
  priceableTokens: number;
  unpriceableTokens: number;
  estimatedCost: number;
  tierCrossingCount: number;
  hasTruncation: boolean;
}

class CostAggregationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CostAggregationError';
  }
}

export const createUnavailableCostResponse = ({
  now,
  reason,
  pricesFetchedAt,
  pricesStale,
  trackingCoverage,
}: {
  now: Date;
  reason: CostUnavailableReason;
  pricesFetchedAt: string | null;
  pricesStale: boolean;
  trackingCoverage: TokenTrackingCoverage;
}): CostResponse => {
  const todayWindow = resolveDailyWindow(now);
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();
  const periodEnd = now.toISOString();
  const groups = COST_BUDGET_GROUPS.map((group) =>
    createGroupCost(
      group,
      {
        totalTokens: 0,
        priceableTokens: 0,
        unpriceableTokens: 0,
        estimatedCost: 0,
        tierCrossingCount: 0,
        hasTruncation: false,
      },
      false
    )
  );

  const unavailablePeriod = (label: PeriodCost['label'], periodStart: string): PeriodCost => ({
    label,
    periodStart,
    periodEnd,
    groups,
    totalEstimatedCost: null,
    totalStatus: 'unavailable',
    totalTokens: 0,
    unknownFeatureTokens: 0,
    unknownFeatureDocCount: 0,
  });

  return {
    today: unavailablePeriod('today', todayWindow.start),
    month: unavailablePeriod('this_month', monthStart),
    asOf: periodEnd,
    pricesFetchedAt,
    pricesStale,
    unavailableReason: reason,
    caveats: [
      ...ALWAYS_PRESENT_CAVEATS,
      ...(trackingCoverage.status === 'full' ? [] : (['tracking_not_all_spaces'] as const)),
      ...(pricesStale ? (['prices_stale'] as const) : []),
    ],
    trackingCoverage,
  };
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

export const isMissingTokenUsageIndex = (error: unknown): boolean => {
  if (!isRecord(error) || error.statusCode !== 404) {
    return false;
  }
  const body = error.body;
  if (!isRecord(body)) {
    return false;
  }
  const esError = body.error;
  return isRecord(esError) && esError.type === 'index_not_found_exception';
};

const createEmptyAccumulator = (): GroupAccumulator => ({
  totalTokens: 0,
  priceableTokens: 0,
  unpriceableTokens: 0,
  estimatedCost: 0,
  tierCrossingCount: 0,
  hasTruncation: false,
});

const createGroupCost = (
  group: CostBudgetGroup,
  accumulator: GroupAccumulator,
  pricesAvailable: boolean
): BudgetGroupCost => {
  if (!pricesAvailable) {
    return {
      group,
      status: 'unavailable',
      estimatedCost: null,
      totalTokens: 0,
      priceableTokens: 0,
      unpriceableTokens: 0,
      tierCrossingCount: 0,
    };
  }
  if (accumulator.totalTokens === 0) {
    return {
      group,
      status: 'complete',
      estimatedCost: 0,
      totalTokens: 0,
      priceableTokens: 0,
      unpriceableTokens: 0,
      tierCrossingCount: 0,
    };
  }
  const isPartial =
    accumulator.unpriceableTokens > 0 ||
    accumulator.hasTruncation ||
    accumulator.tierCrossingCount > 0;
  return {
    group,
    status: isPartial ? 'partial' : 'complete',
    estimatedCost: accumulator.priceableTokens === 0 ? null : accumulator.estimatedCost,
    totalTokens: accumulator.totalTokens,
    priceableTokens: accumulator.priceableTokens,
    unpriceableTokens: accumulator.unpriceableTokens,
    tierCrossingCount: accumulator.tierCrossingCount,
  };
};

const createZeroPeriod = (
  label: PeriodCost['label'],
  periodStart: string,
  periodEnd: string
): PeriodCost => ({
  label,
  periodStart,
  periodEnd,
  groups: COST_BUDGET_GROUPS.map((group) => createGroupCost(group, createEmptyAccumulator(), true)),
  totalEstimatedCost: 0,
  totalStatus: 'complete',
  totalTokens: 0,
  unknownFeatureTokens: 0,
  unknownFeatureDocCount: 0,
});

const readSum = (aggregate: unknown, path: string): number => {
  const value = isRecord(aggregate) ? aggregate.value : undefined;
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
    throw new CostAggregationError(`Invalid token sum aggregation at ${path}`);
  }
  return value;
};

const readDocCount = (value: unknown, path: string): number => {
  if (
    !isRecord(value) ||
    typeof value.doc_count !== 'number' ||
    !Number.isFinite(value.doc_count) ||
    value.doc_count < 0
  ) {
    throw new CostAggregationError(`Invalid document count aggregation at ${path}`);
  }
  return value.doc_count;
};

const buildCaveats = ({
  pricesStale,
  groups,
  trackingCoverage,
}: {
  pricesStale: boolean;
  groups: BudgetGroupCost[];
  trackingCoverage: TokenTrackingCoverage;
}): CostCaveat[] => {
  const caveats: CostCaveat[] = [...ALWAYS_PRESENT_CAVEATS];
  if (trackingCoverage.status !== 'full') {
    caveats.push('tracking_not_all_spaces');
  }
  if (pricesStale) {
    caveats.push('prices_stale');
  }
  if (groups.some((group) => group.tierCrossingCount > 0)) {
    caveats.push('tier_crossings_detected');
  }
  return caveats;
};

const finalizePeriod = ({
  label,
  periodStart,
  periodEnd,
  groups,
  totalTokens,
  unknownFeatureTokens,
  unknownFeatureDocCount,
}: {
  label: PeriodCost['label'];
  periodStart: string;
  periodEnd: string;
  groups: BudgetGroupCost[];
  totalTokens: number;
  unknownFeatureTokens: number;
  unknownFeatureDocCount: number;
}): PeriodCost => {
  if (totalTokens === 0) {
    return {
      label,
      periodStart,
      periodEnd,
      groups,
      totalEstimatedCost: 0,
      totalStatus: 'complete',
      totalTokens,
      unknownFeatureTokens,
      unknownFeatureDocCount,
    };
  }
  if (groups.some((group) => group.status === 'unavailable')) {
    return {
      label,
      periodStart,
      periodEnd,
      groups,
      totalEstimatedCost: null,
      totalStatus: 'unavailable',
      totalTokens,
      unknownFeatureTokens,
      unknownFeatureDocCount,
    };
  }
  const priceableTokens = groups.reduce((sum, group) => sum + group.priceableTokens, 0);
  const totalEstimatedCost =
    priceableTokens === 0
      ? null
      : groups.reduce((sum, group) => sum + (group.estimatedCost ?? 0), 0);
  let totalStatus: CostStatus = 'complete';
  for (const group of groups) {
    if (STATUS_RANK[group.status] > STATUS_RANK[totalStatus]) {
      totalStatus = group.status;
    }
  }
  if (unknownFeatureTokens > 0 && STATUS_RANK[totalStatus] < STATUS_RANK.partial) {
    totalStatus = 'partial';
  }
  return {
    label,
    periodStart,
    periodEnd,
    groups,
    totalEstimatedCost,
    totalStatus,
    totalTokens,
    unknownFeatureTokens,
    unknownFeatureDocCount,
  };
};

const searchPeriod = async ({
  esClient,
  prices,
  periodStart,
  periodEnd,
}: {
  esClient: ElasticsearchClient;
  prices: PriceMap;
  periodStart: string;
  periodEnd: string;
}): Promise<unknown> => {
  const featureFilters: Record<string, object> = {};
  for (const featureId of KNOWN_FEATURE_IDS) {
    featureFilters[featureId] = { term: { 'inference.feature_id': featureId } };
  }

  const tierCrossingFilters: Record<string, object> = {};
  for (const [modelKey, price] of prices) {
    if (price.tierThreshold !== null) {
      tierCrossingFilters[modelKey] = {
        bool: {
          filter: [
            { term: { 'model.model_id': modelKey } },
            { range: { 'token_usage.prompt_tokens': { gt: price.tierThreshold } } },
          ],
        },
      };
    }
  }

  const featureSubAggregations: Record<string, object> = {
    feature_total_tokens: { sum: { field: 'token_usage.total_tokens' } },
    models: {
      terms: { field: 'model.model_id', size: MODELS_TERMS_SIZE },
      aggs: {
        total_tokens: { sum: { field: 'token_usage.total_tokens' } },
        prompt_tokens: { sum: { field: 'token_usage.prompt_tokens' } },
        cached_tokens: { sum: { field: 'token_usage.cached_tokens' } },
        completion_tokens: { sum: { field: 'token_usage.completion_tokens' } },
        thinking_tokens: { sum: { field: 'token_usage.thinking_tokens' } },
      },
    },
    missing_model: {
      missing: { field: 'model.model_id' },
      aggs: {
        total_tokens: { sum: { field: 'token_usage.total_tokens' } },
      },
    },
  };
  if (Object.keys(tierCrossingFilters).length > 0) {
    featureSubAggregations.tier_crossings = {
      filters: { keyed: true, filters: tierCrossingFilters },
    };
  }

  const response = await esClient.search({
    index: TOKEN_USAGE_INDEX,
    size: 0,
    query: {
      bool: {
        filter: [
          {
            term: { 'inference.parent_feature_id': SIGNIFICANT_EVENTS_INFERENCE_PARENT_FEATURE_ID },
          },
          { range: { '@timestamp': { gte: periodStart, lt: periodEnd } } },
        ],
      },
    },
    aggs: {
      total_tokens: { sum: { field: 'token_usage.total_tokens' } },
      feature_buckets: {
        filters: { keyed: true, filters: featureFilters },
        aggs: featureSubAggregations,
      },
      unknown_features: {
        filter: {
          bool: {
            must_not: [{ terms: { 'inference.feature_id': KNOWN_FEATURE_IDS } }],
          },
        },
        aggs: {
          total_tokens: { sum: { field: 'token_usage.total_tokens' } },
        },
      },
    },
  });

  return 'aggregations' in response ? response.aggregations : undefined;
};

const processPeriodAggregations = ({
  aggregations,
  prices,
  logger,
}: {
  aggregations: unknown;
  prices: PriceMap;
  logger: Logger;
}): {
  groups: Record<CostBudgetGroup, GroupAccumulator>;
  totalTokens: number;
  unknownFeatureTokens: number;
  unknownFeatureDocCount: number;
  unmatchedModelIds: string[];
} => {
  const groups: Record<CostBudgetGroup, GroupAccumulator> = {
    discovery: createEmptyAccumulator(),
    investigation: createEmptyAccumulator(),
    ki_extraction: createEmptyAccumulator(),
    memory: createEmptyAccumulator(),
  };
  const unmatchedModelIds = new Set<string>();
  if (!isRecord(aggregations)) {
    throw new CostAggregationError('Token usage response is missing aggregations');
  }

  const totalTokens = readSum(aggregations.total_tokens, 'total_tokens');
  const unknownFeatures = aggregations.unknown_features;
  if (!isRecord(unknownFeatures)) {
    throw new CostAggregationError('Token usage response is missing unknown feature aggregations');
  }
  const unknownFeatureTokens = readSum(
    unknownFeatures.total_tokens,
    'unknown_features.total_tokens'
  );
  const unknownFeatureDocCount = readDocCount(unknownFeatures, 'unknown_features');

  const featureBucketsParent = aggregations.feature_buckets;
  if (!isRecord(featureBucketsParent) || !isRecord(featureBucketsParent.buckets)) {
    throw new CostAggregationError('Token usage response is missing feature buckets');
  }
  const featureBuckets = featureBucketsParent.buckets;
  const hasTieredPrices = [...prices.values()].some((price) => price.tierThreshold !== null);

  for (const featureId of KNOWN_FEATURE_IDS) {
    const groupName = FEATURE_ID_TO_COST_BUDGET_GROUP[featureId];
    if (!groupName) {
      continue;
    }
    const accumulator = groups[groupName];
    const bucket = featureBuckets[featureId];
    if (!isRecord(bucket)) {
      throw new CostAggregationError(`Token usage response is missing bucket ${featureId}`);
    }
    const featureTotalTokens = readSum(
      bucket.feature_total_tokens,
      `${featureId}.feature_total_tokens`
    );
    accumulator.totalTokens += featureTotalTokens;

    const modelsAgg = bucket.models;
    let returnedModelBucketTotal = 0;
    if (
      !isRecord(modelsAgg) ||
      !Array.isArray(modelsAgg.buckets) ||
      typeof modelsAgg.sum_other_doc_count !== 'number' ||
      !Number.isFinite(modelsAgg.sum_other_doc_count) ||
      modelsAgg.sum_other_doc_count < 0
    ) {
      throw new CostAggregationError(`Invalid model buckets for ${featureId}`);
    }
    const modelBuckets = modelsAgg.buckets;
    for (const modelBucket of modelBuckets) {
      if (!isRecord(modelBucket) || typeof modelBucket.key !== 'string') {
        throw new CostAggregationError(`Invalid model bucket for ${featureId}`);
      }
      const modelId = modelBucket.key;
      const modelTotalTokens = readSum(
        modelBucket.total_tokens,
        `${featureId}.models.${modelId}.total_tokens`
      );
      returnedModelBucketTotal += modelTotalTokens;
      const promptTokens = readSum(
        modelBucket.prompt_tokens,
        `${featureId}.models.${modelId}.prompt_tokens`
      );
      const cachedTokens = readSum(
        modelBucket.cached_tokens,
        `${featureId}.models.${modelId}.cached_tokens`
      );
      const completionTokens = readSum(
        modelBucket.completion_tokens,
        `${featureId}.models.${modelId}.completion_tokens`
      );
      const thinkingTokens = readSum(
        modelBucket.thinking_tokens,
        `${featureId}.models.${modelId}.thinking_tokens`
      );
      const price = prices.get(modelId);
      if (!price) {
        accumulator.unpriceableTokens += modelTotalTokens;
        unmatchedModelIds.add(modelId);
        continue;
      }
      const cacheReadTokens = Math.min(cachedTokens, promptTokens);
      const inputTokens = promptTokens - cacheReadTokens;
      const outputTokens = completionTokens + thinkingTokens;
      if (price.cacheRead !== null) {
        accumulator.estimatedCost +=
          (inputTokens * price.input +
            cacheReadTokens * price.cacheRead +
            outputTokens * price.output) /
          TOKENS_PER_MILLION;
        accumulator.priceableTokens += modelTotalTokens;
      } else if (cacheReadTokens === 0) {
        accumulator.estimatedCost +=
          (inputTokens * price.input + outputTokens * price.output) / TOKENS_PER_MILLION;
        accumulator.priceableTokens += modelTotalTokens;
      } else {
        accumulator.estimatedCost +=
          (inputTokens * price.input + outputTokens * price.output) / TOKENS_PER_MILLION;
        const unpriceableCached = Math.min(cacheReadTokens, modelTotalTokens);
        accumulator.unpriceableTokens += unpriceableCached;
        accumulator.priceableTokens += Math.max(modelTotalTokens - unpriceableCached, 0);
      }
    }

    const missingModel = bucket.missing_model;
    if (!isRecord(missingModel)) {
      throw new CostAggregationError(`Missing model aggregation for ${featureId}`);
    }
    const missingModelTokens = readSum(
      missingModel.total_tokens,
      `${featureId}.missing_model.total_tokens`
    );
    accumulator.unpriceableTokens += missingModelTokens;

    const sumOtherDocCount = modelsAgg.sum_other_doc_count;
    if (returnedModelBucketTotal + missingModelTokens > featureTotalTokens) {
      throw new CostAggregationError(`Model token totals exceed feature total for ${featureId}`);
    }
    const truncatedTokens = Math.max(
      featureTotalTokens - returnedModelBucketTotal - missingModelTokens,
      0
    );
    if (sumOtherDocCount > 0) {
      accumulator.unpriceableTokens += truncatedTokens;
      accumulator.hasTruncation = true;
    } else if (truncatedTokens > 0) {
      throw new CostAggregationError(`Feature token total is not fully accounted for ${featureId}`);
    }

    const tierCrossings = bucket.tier_crossings;
    if (hasTieredPrices && (!isRecord(tierCrossings) || !isRecord(tierCrossings.buckets))) {
      throw new CostAggregationError(`Missing tier crossing aggregation for ${featureId}`);
    }
    const crossingBuckets =
      isRecord(tierCrossings) && isRecord(tierCrossings.buckets) ? tierCrossings.buckets : {};
    for (const [modelKey, crossingBucket] of Object.entries(crossingBuckets)) {
      if (prices.get(modelKey)?.tierThreshold == null) {
        continue;
      }
      accumulator.tierCrossingCount += readDocCount(
        crossingBucket,
        `${featureId}.tier_crossings.${modelKey}`
      );
    }
  }

  for (const [group, accumulator] of Object.entries(groups)) {
    if (accumulator.priceableTokens + accumulator.unpriceableTokens !== accumulator.totalTokens) {
      throw new CostAggregationError(`Token totals are not conserved for ${group}`);
    }
  }
  const classifiedTokens =
    Object.values(groups).reduce((sum, group) => sum + group.totalTokens, 0) + unknownFeatureTokens;
  if (classifiedTokens !== totalTokens) {
    throw new CostAggregationError('Period token total is not fully accounted for');
  }

  if (unknownFeatureDocCount > 0) {
    logger.warn(
      `Significant Events token usage includes ${unknownFeatureDocCount} documents with unknown feature IDs (${unknownFeatureTokens} tokens)`
    );
  }
  if (unmatchedModelIds.size > 0) {
    logger.warn(
      `Unmatched Significant Events token usage model IDs: ${[...unmatchedModelIds].join(', ')}`
    );
  }

  return {
    groups,
    totalTokens,
    unknownFeatureTokens,
    unknownFeatureDocCount,
    unmatchedModelIds: [...unmatchedModelIds],
  };
};

const toPeriodCost = ({
  label,
  periodStart,
  periodEnd,
  aggregations,
  prices,
  logger,
}: {
  label: PeriodCost['label'];
  periodStart: string;
  periodEnd: string;
  aggregations: unknown;
  prices: PriceMap;
  logger: Logger;
}): PeriodCost => {
  const processed = processPeriodAggregations({ aggregations, prices, logger });
  const groups = COST_BUDGET_GROUPS.map((group) =>
    createGroupCost(group, processed.groups[group], true)
  );
  return finalizePeriod({
    label,
    periodStart,
    periodEnd,
    groups,
    totalTokens: processed.totalTokens,
    unknownFeatureTokens: processed.unknownFeatureTokens,
    unknownFeatureDocCount: processed.unknownFeatureDocCount,
  });
};

export const calculateSignificantEventsCost = async ({
  esClient,
  prices,
  pricesFetchedAt,
  pricesStale,
  trackingCoverage,
  now,
  logger,
}: {
  esClient: ElasticsearchClient;
  prices: PriceMap;
  pricesFetchedAt: string;
  pricesStale: boolean;
  trackingCoverage: TokenTrackingCoverage;
  now: Date;
  logger: Logger;
}): Promise<CostResponse> => {
  const todayWindow = resolveDailyWindow(now);
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();
  const periodEnd = now.toISOString();
  const createZeroResponse = (): CostResponse => ({
    today: createZeroPeriod('today', todayWindow.start, periodEnd),
    month: createZeroPeriod('this_month', monthStart, periodEnd),
    asOf: periodEnd,
    pricesFetchedAt,
    pricesStale,
    unavailableReason: null,
    caveats: buildCaveats({ pricesStale, groups: [], trackingCoverage }),
    trackingCoverage,
  });

  try {
    const [todayResult, monthResult] = await Promise.allSettled([
      searchPeriod({
        esClient,
        prices,
        periodStart: todayWindow.start,
        periodEnd,
      }),
      searchPeriod({
        esClient,
        prices,
        periodStart: monthStart,
        periodEnd,
      }),
    ]);
    if (todayResult.status === 'rejected' || monthResult.status === 'rejected') {
      const errors = [todayResult, monthResult]
        .filter((result): result is PromiseRejectedResult => result.status === 'rejected')
        .map((result) => result.reason);
      if (errors.length === 2 && errors.every(isMissingTokenUsageIndex)) {
        return createZeroResponse();
      }
      const nonMissingIndexError = errors.find((error) => !isMissingTokenUsageIndex(error));
      if (nonMissingIndexError) {
        throw nonMissingIndexError;
      }
      throw new CostAggregationError(
        'Token usage data stream was missing for only one requested period'
      );
    }

    const today = toPeriodCost({
      label: 'today',
      periodStart: todayWindow.start,
      periodEnd,
      aggregations: todayResult.value,
      prices,
      logger,
    });
    const month = toPeriodCost({
      label: 'this_month',
      periodStart: monthStart,
      periodEnd,
      aggregations: monthResult.value,
      prices,
      logger,
    });

    return {
      today,
      month,
      asOf: periodEnd,
      pricesFetchedAt,
      pricesStale,
      unavailableReason: null,
      caveats: buildCaveats({
        pricesStale,
        groups: [...today.groups, ...month.groups],
        trackingCoverage,
      }),
      trackingCoverage,
    };
  } catch (error) {
    logger.error(
      `Failed to read Significant Events token usage: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
    return createUnavailableCostResponse({
      now,
      reason: 'usage_data',
      pricesFetchedAt,
      pricesStale,
      trackingCoverage,
    });
  }
};
