/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import { loggerMock } from '@kbn/logging-mocks';
import {
  SIGNIFICANT_EVENTS_DISCOVERY_INFERENCE_FEATURE_ID,
  SIGNIFICANT_EVENTS_INFERENCE_PARENT_FEATURE_ID,
  SIGNIFICANT_EVENTS_INVESTIGATION_INFERENCE_FEATURE_ID,
  SIGNIFICANT_EVENTS_KI_EXTRACTION_INFERENCE_FEATURE_ID,
  SIGNIFICANT_EVENTS_KI_QUERY_GENERATION_INFERENCE_FEATURE_ID,
  SIGNIFICANT_EVENTS_MEMORY_CONSOLIDATION_INFERENCE_FEATURE_ID,
  SIGNIFICANT_EVENTS_MEMORY_CONVERSATION_SCRAPER_INFERENCE_FEATURE_ID,
  SIGNIFICANT_EVENTS_MEMORY_GAP_DETECTION_INFERENCE_FEATURE_ID,
  SIGNIFICANT_EVENTS_MEMORY_INFERENCE_FEATURE_ID,
  SIGNIFICANT_EVENTS_MEMORY_INVESTIGATION_GAPS_INFERENCE_FEATURE_ID,
  SIGNIFICANT_EVENTS_MEMORY_SYNTHESIS_INFERENCE_FEATURE_ID,
} from '@kbn/significant-events-schema';
import { FEATURE_ID_TO_COST_BUDGET_GROUP, type TokenTrackingCoverage } from '../../../common/cost';
import { calculateSignificantEventsCost, createUnavailableCostResponse } from './cost_service';
import type { PriceMap } from './price_service';

const NOW = new Date('2026-09-09T08:30:00.000Z');
const TODAY_START = '2026-09-09T00:00:00.000Z';
const MONTH_START = '2026-09-01T00:00:00.000Z';
const PERIOD_END = NOW.toISOString();
const TRACKING_COVERAGE = {
  status: 'partial',
  enabledSpaceCount: 1,
  totalSpaceCount: 2,
} as const;

const GPT_54 = 'openai-gpt-5.4';
const SONNET = 'anthropic-claude-4.6-sonnet';
const NO_CACHE = 'no-cache-model';

const PRICES: PriceMap = new Map([
  [GPT_54, { input: 3.75, output: 21, cacheRead: 0.375, tierThreshold: 272_000 }],
  [SONNET, { input: 4.5, output: 21, cacheRead: 0.45, tierThreshold: null }],
  [NO_CACHE, { input: 1, output: 2, cacheRead: null, tierThreshold: null }],
]);

const KNOWN_FEATURE_IDS = [
  SIGNIFICANT_EVENTS_DISCOVERY_INFERENCE_FEATURE_ID,
  SIGNIFICANT_EVENTS_INVESTIGATION_INFERENCE_FEATURE_ID,
  SIGNIFICANT_EVENTS_KI_EXTRACTION_INFERENCE_FEATURE_ID,
  SIGNIFICANT_EVENTS_KI_QUERY_GENERATION_INFERENCE_FEATURE_ID,
  SIGNIFICANT_EVENTS_MEMORY_INFERENCE_FEATURE_ID,
  SIGNIFICANT_EVENTS_MEMORY_SYNTHESIS_INFERENCE_FEATURE_ID,
  SIGNIFICANT_EVENTS_MEMORY_CONVERSATION_SCRAPER_INFERENCE_FEATURE_ID,
  SIGNIFICANT_EVENTS_MEMORY_GAP_DETECTION_INFERENCE_FEATURE_ID,
  SIGNIFICANT_EVENTS_MEMORY_CONSOLIDATION_INFERENCE_FEATURE_ID,
  SIGNIFICANT_EVENTS_MEMORY_INVESTIGATION_GAPS_INFERENCE_FEATURE_ID,
] as const;

const modelBucket = ({
  key,
  total,
  prompt,
  cached = 0,
  completion = 0,
  thinking = 0,
}: {
  key: string;
  total: number;
  prompt: number;
  cached?: number;
  completion?: number;
  thinking?: number;
}) => ({
  key,
  doc_count: 1,
  total_tokens: { value: total },
  prompt_tokens: { value: prompt },
  cached_tokens: { value: cached },
  completion_tokens: { value: completion },
  thinking_tokens: { value: thinking },
});

const featureBucket = ({
  featureTotal,
  models = [],
  missing = 0,
  sumOther = 0,
  crossings = {},
}: {
  featureTotal: number;
  models?: ReturnType<typeof modelBucket>[];
  missing?: number;
  sumOther?: number;
  crossings?: Record<string, { doc_count: number }>;
}) => ({
  doc_count: 1,
  feature_total_tokens: { value: featureTotal },
  models: { buckets: models, sum_other_doc_count: sumOther },
  missing_model: { doc_count: missing > 0 ? 1 : 0, total_tokens: { value: missing } },
  tier_crossings: { buckets: crossings },
});

const aggregations = ({
  total,
  features = {},
  unknownTokens = 0,
  unknownDocs = 0,
}: {
  total: number;
  features?: Record<string, ReturnType<typeof featureBucket> | undefined>;
  unknownTokens?: number;
  unknownDocs?: number;
}) => {
  const emptyFeatureBuckets = Object.fromEntries(
    KNOWN_FEATURE_IDS.map((featureId) => [featureId, featureBucket({ featureTotal: 0 })])
  );
  return {
    total_tokens: { value: total },
    feature_buckets: { buckets: { ...emptyFeatureBuckets, ...features } },
    unknown_features: { doc_count: unknownDocs, total_tokens: { value: unknownTokens } },
  };
};

const createEsClient = (impl: (params: Record<string, unknown>) => unknown): ElasticsearchClient =>
  ({
    search: jest.fn(async (params: Record<string, unknown>) => impl(params)),
  } as unknown as ElasticsearchClient);

const calculate = async ({
  esClient,
  prices = PRICES,
  pricesStale = false,
  trackingCoverage = TRACKING_COVERAGE,
  logger = loggerMock.create() as unknown as Logger,
}: {
  esClient: ElasticsearchClient;
  prices?: PriceMap;
  pricesStale?: boolean;
  trackingCoverage?: TokenTrackingCoverage;
  logger?: Logger;
}) =>
  calculateSignificantEventsCost({
    esClient,
    prices,
    pricesFetchedAt: '2026-09-09T06:00:00.000Z',
    pricesStale,
    trackingCoverage,
    now: NOW,
    logger,
  });

const rangeOf = (params: Record<string, unknown>): { gte?: string; lt?: string } => {
  const query = params.query;
  if (!isRecord(query)) {
    return {};
  }
  const bool = query.bool;
  if (!isRecord(bool) || !Array.isArray(bool.filter)) {
    return {};
  }
  for (const filter of bool.filter) {
    if (!isRecord(filter) || !isRecord(filter.range) || !isRecord(filter.range['@timestamp'])) {
      continue;
    }
    const range = filter.range['@timestamp'];
    return {
      gte: typeof range.gte === 'string' ? range.gte : undefined,
      lt: typeof range.lt === 'string' ? range.lt : undefined,
    };
  }
  return {};
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

describe('calculateSignificantEventsCost', () => {
  it('uses the UTC today and first-of-month windows with the same now for ends and asOf', async () => {
    const ranges: Array<{ gte?: string; lt?: string }> = [];
    const esClient = createEsClient((params) => {
      ranges.push(rangeOf(params));
      return { aggregations: aggregations({ total: 0 }) };
    });

    const result = await calculate({ esClient });
    expect(ranges).toEqual([
      { gte: TODAY_START, lt: PERIOD_END },
      { gte: MONTH_START, lt: PERIOD_END },
    ]);
    expect(result.asOf).toBe(PERIOD_END);
    expect(result.today.periodStart).toBe(TODAY_START);
    expect(result.today.periodEnd).toBe(PERIOD_END);
    expect(result.month.periodStart).toBe(MONTH_START);
    expect(result.month.periodEnd).toBe(PERIOD_END);
  });

  it('filters on the parent feature id and maps all 10 feature IDs onto the four groups', async () => {
    const features: Record<string, ReturnType<typeof featureBucket>> = {};
    for (const featureId of KNOWN_FEATURE_IDS) {
      features[featureId] = featureBucket({
        featureTotal: 10,
        models: [modelBucket({ key: SONNET, total: 10, prompt: 10 })],
      });
    }
    const esClient = createEsClient((params) => {
      expect(params).toEqual(
        expect.objectContaining({
          index: '.kibana-inference-token-usage',
          size: 0,
          query: {
            bool: {
              filter: [
                {
                  term: {
                    'inference.parent_feature_id': SIGNIFICANT_EVENTS_INFERENCE_PARENT_FEATURE_ID,
                  },
                },
                expect.objectContaining({ range: { '@timestamp': expect.any(Object) } }),
              ],
            },
          },
        })
      );
      const aggs = params.aggs as {
        feature_buckets: {
          filters: { keyed: boolean; filters: Record<string, unknown> };
          aggs: {
            tier_crossings: { filters: { keyed: boolean; filters: Record<string, unknown> } };
          };
        };
      };
      expect(aggs.feature_buckets.filters).toEqual({
        keyed: true,
        filters: Object.fromEntries(
          KNOWN_FEATURE_IDS.map((featureId) => [
            featureId,
            { term: { 'inference.feature_id': featureId } },
          ])
        ),
      });
      expect(params.aggs).toMatchObject({
        total_tokens: { sum: { field: 'token_usage.total_tokens' } },
        feature_buckets: {
          aggs: {
            feature_total_tokens: { sum: { field: 'token_usage.total_tokens' } },
            models: {
              terms: { field: 'model.model_id', size: 20 },
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
              aggs: { total_tokens: { sum: { field: 'token_usage.total_tokens' } } },
            },
          },
        },
        unknown_features: {
          filter: {
            bool: {
              must_not: [{ terms: { 'inference.feature_id': KNOWN_FEATURE_IDS } }],
            },
          },
          aggs: { total_tokens: { sum: { field: 'token_usage.total_tokens' } } },
        },
      });
      expect(aggs.feature_buckets.aggs.tier_crossings.filters).toEqual({
        keyed: true,
        filters: {
          [GPT_54]: {
            bool: {
              filter: [
                { term: { 'model.model_id': GPT_54 } },
                { range: { 'token_usage.prompt_tokens': { gt: 272_000 } } },
              ],
            },
          },
        },
      });
      return { aggregations: aggregations({ total: 100, features }) };
    });

    const result = await calculate({ esClient });
    expect(FEATURE_ID_TO_COST_BUDGET_GROUP[SIGNIFICANT_EVENTS_DISCOVERY_INFERENCE_FEATURE_ID]).toBe(
      'discovery'
    );
    expect(result.today.groups.map((group) => group.group)).toEqual([
      'discovery',
      'investigation',
      'ki_extraction',
      'memory',
    ]);
    expect(result.today.groups.find((group) => group.group === 'discovery')?.totalTokens).toBe(10);
    expect(result.today.groups.find((group) => group.group === 'investigation')?.totalTokens).toBe(
      10
    );
    expect(result.today.groups.find((group) => group.group === 'ki_extraction')?.totalTokens).toBe(
      20
    );
    expect(result.today.groups.find((group) => group.group === 'memory')?.totalTokens).toBe(60);
  });

  it('prices prompt, cached, completion, and thinking tokens with conserved totals', async () => {
    const priced = featureBucket({
      featureTotal: 1350,
      models: [
        modelBucket({
          key: GPT_54,
          total: 1350,
          prompt: 1000,
          cached: 200,
          completion: 300,
          thinking: 50,
        }),
      ],
    });
    const esClient = createEsClient(() => ({
      aggregations: aggregations({
        total: 1350,
        features: { [SIGNIFICANT_EVENTS_DISCOVERY_INFERENCE_FEATURE_ID]: priced },
      }),
    }));

    const result = await calculate({ esClient });
    const discovery = result.today.groups.find((group) => group.group === 'discovery');
    expect(discovery).toMatchObject({
      totalTokens: 1350,
      priceableTokens: 1350,
      unpriceableTokens: 0,
    });
    expect(discovery?.estimatedCost).toBeCloseTo((800 * 3.75 + 200 * 0.375 + 350 * 21) / 1_000_000);
  });

  it('clamps cached tokens to prompt tokens before pricing malformed usage', async () => {
    const clamped = featureBucket({
      featureTotal: 150,
      models: [modelBucket({ key: SONNET, total: 150, prompt: 100, cached: 150, completion: 50 })],
    });
    const result = await calculate({
      esClient: createEsClient(() => ({
        aggregations: aggregations({
          total: 150,
          features: { [SIGNIFICANT_EVENTS_DISCOVERY_INFERENCE_FEATURE_ID]: clamped },
        }),
      })),
    });
    const discovery = result.today.groups.find((group) => group.group === 'discovery');
    expect(discovery).toMatchObject({
      totalTokens: 150,
      priceableTokens: 150,
      unpriceableTokens: 0,
    });
    expect(discovery?.estimatedCost).toBeCloseTo((100 * 0.45 + 50 * 21) / 1_000_000);
  });

  it('keeps missing cache-read priceable when cached tokens are zero and partial when they are not', async () => {
    const zeroCached = featureBucket({
      featureTotal: 100,
      models: [modelBucket({ key: NO_CACHE, total: 100, prompt: 40, completion: 60 })],
    });
    const positiveCached = featureBucket({
      featureTotal: 100,
      models: [modelBucket({ key: NO_CACHE, total: 100, prompt: 40, cached: 10, completion: 60 })],
    });
    const esClient = createEsClient((params) => {
      const { gte } = rangeOf(params);
      return {
        aggregations: aggregations({
          total: 100,
          features: {
            [SIGNIFICANT_EVENTS_DISCOVERY_INFERENCE_FEATURE_ID]:
              gte === TODAY_START ? zeroCached : positiveCached,
          },
        }),
      };
    });

    const result = await calculate({ esClient });
    const today = result.today.groups.find((group) => group.group === 'discovery');
    expect(today).toMatchObject({ status: 'complete', priceableTokens: 100, unpriceableTokens: 0 });
    expect(today?.estimatedCost).toBeCloseTo((40 * 1 + 60 * 2) / 1_000_000);

    const month = result.month.groups.find((group) => group.group === 'discovery');
    expect(month).toMatchObject({
      status: 'partial',
      priceableTokens: 90,
      unpriceableTokens: 10,
    });
    expect(month?.estimatedCost).toBeCloseTo((30 * 1 + 60 * 2) / 1_000_000);
  });

  it('treats missing and unmatched model IDs as unpriceable', async () => {
    const esClient = createEsClient(() => ({
      aggregations: aggregations({
        total: 70,
        features: {
          [SIGNIFICANT_EVENTS_DISCOVERY_INFERENCE_FEATURE_ID]: featureBucket({
            featureTotal: 70,
            models: [modelBucket({ key: 'unknown-model', total: 40, prompt: 40 })],
            missing: 30,
          }),
        },
      }),
    }));

    const result = await calculate({ esClient });
    const discovery = result.today.groups.find((group) => group.group === 'discovery');
    expect(discovery).toMatchObject({
      status: 'partial',
      estimatedCost: null,
      totalTokens: 70,
      priceableTokens: 0,
      unpriceableTokens: 70,
    });
  });

  it('stores unknown feature IDs only at period level and downgrades total status', async () => {
    const esClient = createEsClient(() => ({
      aggregations: aggregations({
        total: 25,
        features: {
          [SIGNIFICANT_EVENTS_DISCOVERY_INFERENCE_FEATURE_ID]: featureBucket({
            featureTotal: 10,
            models: [modelBucket({ key: SONNET, total: 10, prompt: 10 })],
          }),
        },
        unknownTokens: 15,
        unknownDocs: 2,
      }),
    }));

    const result = await calculate({ esClient });
    expect(result.today.unknownFeatureTokens).toBe(15);
    expect(result.today.unknownFeatureDocCount).toBe(2);
    expect(result.today.groups.every((group) => group.unpriceableTokens === 0)).toBe(true);
    expect(result.today.totalStatus).toBe('partial');
    expect(result.today.totalEstimatedCost).not.toBeNull();
  });

  it('accounts for returned, missing-model, and truncated tokens exactly once', async () => {
    const esClient = createEsClient(() => ({
      aggregations: aggregations({
        total: 100,
        features: {
          [SIGNIFICANT_EVENTS_DISCOVERY_INFERENCE_FEATURE_ID]: featureBucket({
            featureTotal: 100,
            models: [modelBucket({ key: SONNET, total: 50, prompt: 50 })],
            missing: 20,
            sumOther: 3,
          }),
        },
      }),
    }));

    const result = await calculate({ esClient });
    const discovery = result.today.groups.find((group) => group.group === 'discovery');
    expect(discovery).toMatchObject({
      status: 'partial',
      totalTokens: 100,
      unpriceableTokens: 50,
      priceableTokens: 50,
    });
    expect(discovery?.estimatedCost).toBeCloseTo((50 * 4.5) / 1_000_000);
  });

  it('marks GPT-5.4 prompt crossings above 272,000 as partial', async () => {
    const esClient = createEsClient(() => ({
      aggregations: aggregations({
        total: 300_010,
        features: {
          [SIGNIFICANT_EVENTS_DISCOVERY_INFERENCE_FEATURE_ID]: featureBucket({
            featureTotal: 300_010,
            models: [modelBucket({ key: GPT_54, total: 300_010, prompt: 300_000, completion: 10 })],
            crossings: { [GPT_54]: { doc_count: 4 } },
          }),
        },
      }),
    }));

    const result = await calculate({ esClient });
    expect(
      result.today.groups.find((group) => group.group === 'discovery')?.tierCrossingCount
    ).toBe(4);
    expect(result.today.groups.find((group) => group.group === 'discovery')?.status).toBe(
      'partial'
    );
    expect(result.today.totalStatus).toBe('partial');
    expect(result.caveats).toContain('tier_crossings_detected');
  });

  it('returns complete zero cost and a partial null estimate when nothing is priceable', async () => {
    const emptyClient = createEsClient(() => ({ aggregations: aggregations({ total: 0 }) }));
    const empty = await calculate({ esClient: emptyClient });
    expect(empty.today).toMatchObject({
      totalTokens: 0,
      totalEstimatedCost: 0,
      totalStatus: 'complete',
    });
    expect(empty.today.groups.every((group) => group.estimatedCost === 0)).toBe(true);

    const unpriceableClient = createEsClient(() => ({
      aggregations: aggregations({
        total: 5,
        features: {
          [SIGNIFICANT_EVENTS_DISCOVERY_INFERENCE_FEATURE_ID]: featureBucket({
            featureTotal: 5,
            models: [modelBucket({ key: 'missing', total: 5, prompt: 5 })],
          }),
        },
      }),
    }));
    const unpriceable = await calculate({ esClient: unpriceableClient });
    expect(unpriceable.today.totalEstimatedCost).toBeNull();
    expect(
      unpriceable.today.groups.find((group) => group.group === 'discovery')?.estimatedCost
    ).toBeNull();
    expect(unpriceable.today.totalStatus).toBe('partial');
  });

  it.each([
    ['missing root aggregations', () => ({})],
    [
      'missing known feature bucket',
      () => {
        const value = aggregations({ total: 0 });
        delete value.feature_buckets.buckets[SIGNIFICANT_EVENTS_DISCOVERY_INFERENCE_FEATURE_ID];
        return { aggregations: value };
      },
    ],
    [
      'missing model subaggregation',
      () => {
        const value = aggregations({ total: 0 });
        const bucket =
          value.feature_buckets.buckets[SIGNIFICANT_EVENTS_DISCOVERY_INFERENCE_FEATURE_ID];
        return {
          aggregations: {
            ...value,
            feature_buckets: {
              buckets: {
                ...value.feature_buckets.buckets,
                [SIGNIFICANT_EVENTS_DISCOVERY_INFERENCE_FEATURE_ID]: {
                  ...bucket,
                  models: undefined,
                },
              },
            },
          },
        };
      },
    ],
    ['unconserved period total', () => ({ aggregations: aggregations({ total: 1 }) })],
  ])('returns usage-data unavailable for %s', async (_caseName, responseFactory) => {
    const logger = loggerMock.create() as unknown as Logger;
    const result = await calculate({
      esClient: createEsClient(responseFactory),
      logger,
    });
    expect(result.unavailableReason).toBe('usage_data');
    expect(result.today.totalStatus).toBe('unavailable');
    expect(result.today.totalEstimatedCost).toBeNull();
    expect(logger.error).toHaveBeenCalledWith(
      expect.stringContaining('Failed to read Significant Events token usage')
    );
  });

  it('returns valid zero periods for a missing data stream and usage-data unavailable for other errors', async () => {
    const missingIndex = Object.assign(new Error('no such index'), {
      statusCode: 404,
      body: { error: { type: 'index_not_found_exception' } },
    });
    const zeros = await calculate({
      esClient: createEsClient(() => {
        throw missingIndex;
      }),
    });
    expect(zeros.unavailableReason).toBeNull();
    expect(zeros.today.totalTokens).toBe(0);
    expect(zeros.today.totalEstimatedCost).toBe(0);
    expect(zeros.today.totalStatus).toBe('complete');

    const other404 = Object.assign(new Error('nope'), {
      statusCode: 404,
      body: { error: { type: 'security_exception' } },
    });
    const unavailable = await calculate({
      esClient: createEsClient(() => {
        throw other404;
      }),
    });
    expect(unavailable.unavailableReason).toBe('usage_data');
  });

  it('returns unavailable when only one period reports a missing data stream', async () => {
    const missingIndex = Object.assign(new Error('no such index'), {
      statusCode: 404,
      body: { error: { type: 'index_not_found_exception' } },
    });
    let searchCount = 0;
    const result = await calculate({
      esClient: createEsClient(() => {
        searchCount += 1;
        if (searchCount === 1) {
          throw missingIndex;
        }
        return { aggregations: aggregations({ total: 0 }) };
      }),
    });
    expect(searchCount).toBe(2);
    expect(result.unavailableReason).toBe('usage_data');
    expect(result.today.totalStatus).toBe('unavailable');
    expect(result.month.totalStatus).toBe('unavailable');
  });

  it('includes every applicable caveat exactly once', async () => {
    const esClient = createEsClient(() => ({
      aggregations: aggregations({
        total: 300_010,
        features: {
          [SIGNIFICANT_EVENTS_DISCOVERY_INFERENCE_FEATURE_ID]: featureBucket({
            featureTotal: 300_010,
            models: [modelBucket({ key: GPT_54, total: 300_010, prompt: 300_000, completion: 10 })],
            crossings: { [GPT_54]: { doc_count: 1 } },
          }),
        },
      }),
    }));
    const result = await calculate({ esClient, pricesStale: true });
    const expectedCaveats = [
      'eis_pricing_assumed',
      'usd_assumed',
      'excludes_embeddings',
      'excludes_failed_calls',
      'excludes_cache_writes',
      'tracking_not_all_spaces',
      'prices_stale',
      'tier_crossings_detected',
    ] as const;
    expect(new Set(result.caveats)).toEqual(new Set(expectedCaveats));
    expect(result.caveats).toHaveLength(expectedCaveats.length);
  });

  it('omits the incomplete-tracking caveat when every space is tracked', async () => {
    const result = await calculate({
      esClient: createEsClient(() => ({
        aggregations: aggregations({ total: 0 }),
      })),
      trackingCoverage: {
        status: 'full',
        enabledSpaceCount: 2,
        totalSpaceCount: 2,
      },
    });
    expect(result.caveats).not.toContain('tracking_not_all_spaces');
  });

  it('builds structured unavailable responses for missing prices', () => {
    const response = createUnavailableCostResponse({
      now: NOW,
      reason: 'pricing',
      pricesFetchedAt: null,
      pricesStale: false,
      trackingCoverage: TRACKING_COVERAGE,
    });
    expect(response.unavailableReason).toBe('pricing');
    expect(response.pricesFetchedAt).toBeNull();
    expect(response.today.groups.every((group) => group.status === 'unavailable')).toBe(true);
    expect(response.today.totalTokens).toBe(0);
    expect(response.trackingCoverage).toEqual(TRACKING_COVERAGE);
  });
});
