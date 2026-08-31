/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import { SIGNIFICANT_EVENTS_INFERENCE_PARENT_FEATURE_ID } from '@kbn/significant-events-schema';
import { RUN_BUDGET_GROUP_IDS, type RunBudgetGroupId } from '../../../common/run_quotas';
import {
  INFERENCE_FEATURE_BUDGET_GROUPS,
  SIGNIFICANT_EVENTS_INFERENCE_FEATURE_IDS,
} from '../run_quotas/budget_groups';
import type { InferenceServiceMap } from './inference_service_map';
import type {
  InferencePrice,
  InferencePriceOperation,
  ParsedPriceCatalog,
  PriceServiceResult,
} from './price_service';
import type { SpaceTrackingCoverage } from './space_coverage';

const TOKEN_USAGE_DATA_STREAM = '.kibana-inference-token-usage';
const UNKNOWN_FEATURE_BUCKET = '__unknown_feature__';
const MISSING_DIMENSION = '__missing__';
const CELL_BUCKET_LIMIT = 1000;
const ONE_MILLION = 1_000_000;

export interface CostPeriod {
  kind: 'today' | 'month';
  start: string;
  end: string;
}

export interface TokenCounts {
  prompt: number;
  cached: number;
  completion: number;
  thinking: number;
}

export type CostCoverageState = 'complete' | 'partial' | 'unavailable';

export interface TierCrossing {
  modelId: string;
  threshold: number;
  documentCount: number;
}

export interface CostFigure {
  estimatedCost: number | null;
  coverage: CostCoverageState;
  tokens: TokenCounts;
  pricedTokenCount: number;
  unpricedTokenCount: number;
  nonEisTokenCount: number;
  unpricedConnectorIds: string[];
  nonEisConnectorIds: string[];
  byoConnectorIds: string[];
  selfHostedConnectorIds: string[];
  missingModelIds: string[];
  truncated: boolean;
}

export interface TokenIndexCostResult {
  source: 'token_index';
  period: CostPeriod & {
    label: 'today' | 'month_to_date' | 'unverified_period';
    fullCoverage: boolean;
    coveredSince?: string;
  };
  total: CostFigure;
  groups: Record<RunBudgetGroupId, CostFigure>;
  unknownFeatureDocumentCount: number;
  tierCrossings: TierCrossing[];
  priceStale: boolean;
  serviceMapStale: boolean;
  priceFetchedAt: string;
  currency: ParsedPriceCatalog['currency'];
  knownGaps: [
    'mid_stream_failures_unrecorded',
    'non_chat_inference_excluded',
    'token_index_write_failures_unrecorded',
    'cache_write_tokens_unavailable'
  ];
}

interface TokenCell {
  connectorId: string;
  modelId: string;
  tokens: TokenCounts;
}

interface SumAggregation {
  value?: number | null;
}

interface ConnectorModelBucket {
  key: [string, string];
  doc_count: number;
  prompt_tokens?: SumAggregation;
  cached_tokens?: SumAggregation;
  completion_tokens?: SumAggregation;
  thinking_tokens?: SumAggregation;
}

interface FeatureBucket {
  doc_count: number;
  connector_model?: {
    buckets?: ConnectorModelBucket[];
    sum_other_doc_count?: number;
  };
}

interface TokenUsageSearchResponse {
  aggregations?: {
    feature_buckets?: {
      buckets?: Record<string, FeatureBucket>;
    };
    tier_crossings?: {
      buckets?: Record<string, { doc_count: number }>;
    };
  };
}

interface PriceCalculation {
  estimatedCost: number;
  pricedTokenCount: number;
  unpricedTokenCount: number;
  missingOperations: InferencePriceOperation[];
  invalid: boolean;
}

const emptyTokenCounts = (): TokenCounts => ({
  prompt: 0,
  cached: 0,
  completion: 0,
  thinking: 0,
});

const addTokenCounts = (left: TokenCounts, right: TokenCounts): TokenCounts => ({
  prompt: left.prompt + right.prompt,
  cached: left.cached + right.cached,
  completion: left.completion + right.completion,
  thinking: left.thinking + right.thinking,
});

const billableTokenCount = ({ prompt, completion, thinking }: TokenCounts): number =>
  prompt + completion + thinking;

const sumValue = (aggregation: SumAggregation | undefined): number => {
  const value = aggregation?.value ?? 0;
  return Number.isFinite(value) && value >= 0 ? value : 0;
};

const lowerTierPrice = (
  prices: readonly InferencePrice[],
  operation: InferencePriceOperation
): InferencePrice | undefined => {
  const operationPrices = prices.filter((price) => price.operation === operation);
  return (
    operationPrices.find(({ promptTier }) => promptTier.direction === 'flat') ??
    operationPrices
      .filter(({ promptTier }) => promptTier.direction === 'up_to')
      .sort(
        (left, right) =>
          (left.promptTier.threshold ?? Number.MAX_SAFE_INTEGER) -
          (right.promptTier.threshold ?? Number.MAX_SAFE_INTEGER)
      )[0]
  );
};

export const calculateTokenCost = ({
  tokens,
  modelPrices,
}: {
  tokens: TokenCounts;
  modelPrices: readonly InferencePrice[];
}): PriceCalculation => {
  if (tokens.cached > tokens.prompt) {
    return {
      estimatedCost: 0,
      pricedTokenCount: 0,
      unpricedTokenCount: billableTokenCount(tokens),
      missingOperations: [],
      invalid: true,
    };
  }
  const components: Array<{
    operation: InferencePriceOperation;
    tokens: number;
  }> = [
    { operation: 'input', tokens: tokens.prompt - tokens.cached },
    { operation: 'cache_read', tokens: tokens.cached },
    { operation: 'output', tokens: tokens.completion + tokens.thinking },
  ];
  let estimatedCost = 0;
  let pricedTokenCount = 0;
  let unpricedTokenCount = 0;
  const missingOperations: InferencePriceOperation[] = [];

  for (const component of components) {
    if (component.tokens === 0) {
      continue;
    }
    const price = lowerTierPrice(modelPrices, component.operation);
    if (!price) {
      missingOperations.push(component.operation);
      unpricedTokenCount += component.tokens;
      continue;
    }
    estimatedCost += (component.tokens * price.unitAmount) / ONE_MILLION;
    pricedTokenCount += component.tokens;
  }

  return {
    estimatedCost,
    pricedTokenCount,
    unpricedTokenCount,
    missingOperations,
    invalid: false,
  };
};

const getTierThresholds = (
  catalog: ParsedPriceCatalog
): Array<{ modelId: string; threshold: number }> => {
  const keys = new Set<string>();
  const thresholds: Array<{ modelId: string; threshold: number }> = [];
  for (const [modelId, prices] of catalog.pricesByModel) {
    for (const price of prices) {
      if (price.promptTier.direction !== 'up_to' || price.promptTier.threshold === null) {
        continue;
      }
      const key = `${modelId}:${price.promptTier.threshold}`;
      if (!keys.has(key)) {
        keys.add(key);
        thresholds.push({ modelId, threshold: price.promptTier.threshold });
      }
    }
  }
  return thresholds;
};

const buildSearchRequest = ({
  period,
  catalog,
}: {
  period: CostPeriod;
  catalog: ParsedPriceCatalog;
}) => {
  const featureFilters = Object.fromEntries(
    SIGNIFICANT_EVENTS_INFERENCE_FEATURE_IDS.map((featureId) => [
      featureId,
      { term: { 'inference.feature_id': featureId } },
    ])
  );
  const tierThresholds = getTierThresholds(catalog);
  const tierFilters = Object.fromEntries(
    tierThresholds.map(({ modelId, threshold }) => [
      `${modelId}:${threshold}`,
      {
        bool: {
          filter: [
            { term: { 'model.model_id': modelId } },
            { range: { 'token_usage.prompt_tokens': { gt: threshold } } },
          ],
        },
      },
    ])
  );

  return {
    index: TOKEN_USAGE_DATA_STREAM,
    size: 0,
    allow_no_indices: true,
    ignore_unavailable: true,
    query: {
      bool: {
        filter: [
          {
            term: {
              'inference.parent_feature_id': SIGNIFICANT_EVENTS_INFERENCE_PARENT_FEATURE_ID,
            },
          },
          { range: { '@timestamp': { gte: period.start, lt: period.end } } },
        ],
      },
    },
    aggs: {
      feature_buckets: {
        filters: {
          filters: {
            ...featureFilters,
            [UNKNOWN_FEATURE_BUCKET]: {
              bool: {
                must_not: [
                  {
                    terms: {
                      'inference.feature_id': SIGNIFICANT_EVENTS_INFERENCE_FEATURE_IDS,
                    },
                  },
                ],
              },
            },
          },
        },
        aggs: {
          connector_model: {
            multi_terms: {
              terms: [
                {
                  field: 'inference.connector_id',
                  missing: MISSING_DIMENSION,
                },
                {
                  field: 'model.model_id',
                  missing: MISSING_DIMENSION,
                },
              ],
              size: CELL_BUCKET_LIMIT,
            },
            aggs: {
              prompt_tokens: { sum: { field: 'token_usage.prompt_tokens' } },
              cached_tokens: { sum: { field: 'token_usage.cached_tokens' } },
              completion_tokens: { sum: { field: 'token_usage.completion_tokens' } },
              thinking_tokens: { sum: { field: 'token_usage.thinking_tokens' } },
            },
          },
        },
      },
      ...(tierThresholds.length > 0
        ? {
            tier_crossings: {
              filters: { filters: tierFilters },
            },
          }
        : {}),
    },
  };
};

const mergeCell = (cells: Map<string, TokenCell>, cell: TokenCell): void => {
  const key = `${cell.connectorId}\u0000${cell.modelId}`;
  const current = cells.get(key);
  cells.set(
    key,
    current ? { ...current, tokens: addTokenCounts(current.tokens, cell.tokens) } : cell
  );
};

const cellsFromBucket = (bucket: FeatureBucket): TokenCell[] =>
  (bucket.connector_model?.buckets ?? []).map((cell) => ({
    connectorId: cell.key[0],
    modelId: cell.key[1],
    tokens: {
      prompt: sumValue(cell.prompt_tokens),
      cached: sumValue(cell.cached_tokens),
      completion: sumValue(cell.completion_tokens),
      thinking: sumValue(cell.thinking_tokens),
    },
  }));

const periodHasFullTracking = (period: CostPeriod, spaceCoverage: SpaceTrackingCoverage): boolean =>
  spaceCoverage.currentSpaceTracking === 'enabled' &&
  spaceCoverage.allSpacesTracked &&
  spaceCoverage.fullTrackingSince !== undefined &&
  spaceCoverage.fullTrackingSince <= period.start;

const buildFigure = ({
  cells,
  truncated,
  catalog,
  serviceMap,
  baseCoverageComplete,
  costVisible,
  priceStale,
}: {
  cells: Iterable<TokenCell>;
  truncated: boolean;
  catalog: ParsedPriceCatalog;
  serviceMap: InferenceServiceMap;
  baseCoverageComplete: boolean;
  costVisible: boolean;
  priceStale: boolean;
}): CostFigure => {
  let tokens = emptyTokenCounts();
  let estimatedCost = 0;
  let pricedTokenCount = 0;
  let unpricedTokenCount = 0;
  let nonEisTokenCount = 0;
  let invalid = false;
  const unpricedConnectorIds = new Set<string>();
  const nonEisConnectorIds = new Set<string>();
  const byoConnectorIds = new Set<string>();
  const selfHostedConnectorIds = new Set<string>();
  const missingModelIds = new Set<string>();

  for (const cell of cells) {
    tokens = addTokenCounts(tokens, cell.tokens);
    const cellTokenCount = billableTokenCount(cell.tokens);
    const endpoint = serviceMap.get(cell.connectorId);
    if (!endpoint) {
      unpricedConnectorIds.add(cell.connectorId);
      unpricedTokenCount += cellTokenCount;
      continue;
    }
    if (endpoint.service !== 'elastic') {
      nonEisConnectorIds.add(cell.connectorId);
      if (endpoint.service === 'elasticsearch') {
        selfHostedConnectorIds.add(cell.connectorId);
      } else {
        byoConnectorIds.add(cell.connectorId);
      }
      unpricedTokenCount += cellTokenCount;
      nonEisTokenCount += cellTokenCount;
      continue;
    }
    if (cell.modelId === MISSING_DIMENSION) {
      missingModelIds.add(MISSING_DIMENSION);
      unpricedTokenCount += cellTokenCount;
      continue;
    }
    const modelPrices = catalog.pricesByModel.get(cell.modelId);
    if (!modelPrices) {
      missingModelIds.add(cell.modelId);
      unpricedTokenCount += cellTokenCount;
      continue;
    }
    const calculation = calculateTokenCost({ tokens: cell.tokens, modelPrices });
    estimatedCost += calculation.estimatedCost;
    pricedTokenCount += calculation.pricedTokenCount;
    unpricedTokenCount += calculation.unpricedTokenCount;
    invalid = invalid || calculation.invalid;
    if (calculation.missingOperations.length > 0) {
      missingModelIds.add(cell.modelId);
    }
  }

  const totalTokenCount = billableTokenCount(tokens);
  const incomplete =
    !baseCoverageComplete || priceStale || truncated || invalid || unpricedTokenCount > 0;
  const coverage: CostCoverageState = !costVisible
    ? 'unavailable'
    : totalTokenCount === 0
    ? incomplete
      ? 'unavailable'
      : 'complete'
    : pricedTokenCount === 0
    ? 'unavailable'
    : incomplete
    ? 'partial'
    : 'complete';

  if (!costVisible) {
    return {
      estimatedCost: null,
      coverage: 'unavailable',
      tokens: emptyTokenCounts(),
      pricedTokenCount: 0,
      unpricedTokenCount: 0,
      nonEisTokenCount: 0,
      unpricedConnectorIds: [],
      nonEisConnectorIds: [],
      byoConnectorIds: [],
      selfHostedConnectorIds: [],
      missingModelIds: [],
      truncated: false,
    };
  }

  return {
    estimatedCost:
      coverage === 'unavailable' || (coverage !== 'complete' && estimatedCost === 0)
        ? null
        : estimatedCost,
    coverage,
    tokens,
    pricedTokenCount,
    unpricedTokenCount,
    nonEisTokenCount,
    unpricedConnectorIds: [...unpricedConnectorIds].sort(),
    nonEisConnectorIds: [...nonEisConnectorIds].sort(),
    byoConnectorIds: [...byoConnectorIds].sort(),
    selfHostedConnectorIds: [...selfHostedConnectorIds].sort(),
    missingModelIds: [...missingModelIds].sort(),
    truncated,
  };
};

export const aggregateSignificantEventsTokenCost = async ({
  esClient,
  priceResult,
  serviceMap,
  serviceMapStale = false,
  spaceCoverage,
  period,
  logger,
}: {
  esClient: ElasticsearchClient;
  priceResult: PriceServiceResult;
  serviceMap: InferenceServiceMap;
  serviceMapStale?: boolean;
  spaceCoverage: SpaceTrackingCoverage;
  period: CostPeriod;
  logger: Pick<Logger, 'error' | 'warn'>;
}): Promise<TokenIndexCostResult> => {
  const request = buildSearchRequest({ period, catalog: priceResult.catalog });
  const response = (await esClient.search(request)) as unknown as TokenUsageSearchResponse;
  const featureBuckets = response.aggregations?.feature_buckets?.buckets ?? {};
  const groupCells = Object.fromEntries(
    RUN_BUDGET_GROUP_IDS.map((group) => [group, new Map<string, TokenCell>()])
  ) as Record<RunBudgetGroupId, Map<string, TokenCell>>;
  const groupTruncated = Object.fromEntries(
    RUN_BUDGET_GROUP_IDS.map((group) => [group, false])
  ) as Record<RunBudgetGroupId, boolean>;
  const totalCells = new Map<string, TokenCell>();
  let totalTruncated = false;
  let unknownFeatureDocumentCount = 0;

  for (const [featureId, bucket] of Object.entries(featureBuckets)) {
    const truncated = (bucket.connector_model?.sum_other_doc_count ?? 0) > 0;
    totalTruncated = totalTruncated || truncated;
    const cells = cellsFromBucket(bucket);
    cells.forEach((cell) => mergeCell(totalCells, cell));
    if (featureId === UNKNOWN_FEATURE_BUCKET) {
      unknownFeatureDocumentCount = bucket.doc_count;
      if (bucket.doc_count > 0) {
        logger.error(
          `Found ${bucket.doc_count} Significant Events token documents with unknown inference feature ids`
        );
      }
      continue;
    }
    const group =
      INFERENCE_FEATURE_BUDGET_GROUPS[featureId as keyof typeof INFERENCE_FEATURE_BUDGET_GROUPS];
    if (!group) {
      continue;
    }
    cells.forEach((cell) => mergeCell(groupCells[group], cell));
    groupTruncated[group] = groupTruncated[group] || truncated;
  }

  const allTokens = [...totalCells.values()].reduce(
    (total, cell) => addTokenCounts(total, cell.tokens),
    emptyTokenCounts()
  );
  if (allTokens.thinking > 0) {
    logger.warn(
      `Significant Events recorded ${allTokens.thinking} thinking tokens; they are priced as output`
    );
  }

  const fullTracking = periodHasFullTracking(period, spaceCoverage);
  const costVisible = spaceCoverage.currentSpaceTracking === 'enabled';
  const baseCoverageComplete = fullTracking && spaceCoverage.unavailableSpaceCount === 0;
  const groups = Object.fromEntries(
    RUN_BUDGET_GROUP_IDS.map((group) => [
      group,
      buildFigure({
        cells: groupCells[group].values(),
        truncated: groupTruncated[group],
        catalog: priceResult.catalog,
        serviceMap,
        baseCoverageComplete,
        costVisible,
        priceStale: priceResult.stale || serviceMapStale,
      }),
    ])
  ) as Record<RunBudgetGroupId, CostFigure>;
  const tierCrossings = getTierThresholds(priceResult.catalog).flatMap(
    ({ modelId, threshold }): TierCrossing[] => {
      const documentCount =
        response.aggregations?.tier_crossings?.buckets?.[`${modelId}:${threshold}`]?.doc_count ?? 0;
      return documentCount > 0 ? [{ modelId, threshold, documentCount }] : [];
    }
  );
  tierCrossings.forEach(({ modelId, threshold, documentCount }) => {
    logger.warn(
      `Significant Events recorded ${documentCount} ${modelId} calls above the ${threshold}-token lower-price tier`
    );
  });

  return {
    source: 'token_index',
    period: {
      ...period,
      label:
        period.kind === 'today' ? 'today' : fullTracking ? 'month_to_date' : 'unverified_period',
      fullCoverage: baseCoverageComplete,
      ...(spaceCoverage.fullTrackingSince ? { coveredSince: spaceCoverage.fullTrackingSince } : {}),
    },
    total: buildFigure({
      cells: totalCells.values(),
      truncated: totalTruncated,
      catalog: priceResult.catalog,
      serviceMap,
      baseCoverageComplete: baseCoverageComplete && unknownFeatureDocumentCount === 0,
      costVisible,
      priceStale: priceResult.stale || serviceMapStale,
    }),
    groups,
    unknownFeatureDocumentCount: costVisible ? unknownFeatureDocumentCount : 0,
    tierCrossings: costVisible ? tierCrossings : [],
    priceStale: priceResult.stale,
    serviceMapStale,
    priceFetchedAt: priceResult.fetchedAt,
    currency: priceResult.catalog.currency,
    knownGaps: [
      'mid_stream_failures_unrecorded',
      'non_chat_inference_excluded',
      'token_index_write_failures_unrecorded',
      'cache_write_tokens_unavailable',
    ],
  };
};
