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
  SIGNIFICANT_EVENTS_TRIAGE_INFERENCE_FEATURE_ID,
} from '@kbn/significant-events-schema';
import { FEATURE_ID_TO_COST_BUDGET_GROUP } from '../../../common/cost';
import { calculateSignificantEventsCost, createUnavailableCostResponse } from './cost_service';
import type { PriceMap } from './price_service';

const NOW = new Date('2026-09-09T08:30:00.000Z');
const TODAY_START = '2026-09-09T00:00:00.000Z';
const MONTH_START = '2026-09-01T00:00:00.000Z';
const PERIOD_END = NOW.toISOString();

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
  SIGNIFICANT_EVENTS_TRIAGE_INFERENCE_FEATURE_ID,
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
}) => ({
  total_tokens: { value: total },
  feature_buckets: { buckets: features },
  unknown_features: { doc_count: unknownDocs, total_tokens: { value: unknownTokens } },
});

const createEsClient = (impl: (params: Record<string, unknown>) => unknown): ElasticsearchClient =>
  ({
    search: jest.fn(async (params: Record<string, unknown>) => impl(params)),
  } as unknown as ElasticsearchClient);

const calculate = async ({
  esClient,
  prices = PRICES,
  pricesStale = false,
  logger = loggerMock.create() as unknown as Logger,
}: {
  esClient: ElasticsearchClient;
  prices?: PriceMap;
  pricesStale?: boolean;
  logger?: Logger;
}) =>
  calculateSignificantEventsCost({
    esClient,
    prices,
    pricesFetchedAt: '2026-09-09T06:00:00.000Z',
    pricesStale,
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

  it('filters on the parent feature id and maps all 11 feature IDs onto the four groups', async () => {
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
        feature_buckets: { filters: { filters: Record<string, unknown> } };
      };
      expect(Object.keys(aggs.feature_buckets.filters.filters).sort()).toEqual(
        [...KNOWN_FEATURE_IDS].sort()
      );
      return { aggregations: aggregations({ total: 110, features }) };
    });

    const result = await calculate({ esClient });
    expect(FEATURE_ID_TO_COST_BUDGET_GROUP[SIGNIFICANT_EVENTS_DISCOVERY_INFERENCE_FEATURE_ID]).toBe(
      'detection'
    );
    expect(FEATURE_ID_TO_COST_BUDGET_GROUP[SIGNIFICANT_EVENTS_TRIAGE_INFERENCE_FEATURE_ID]).toBe(
      'detection'
    );
    expect(result.today.groups.map((group) => group.group)).toEqual([
      'detection',
      'investigation',
      'ki_extraction',
      'memory',
    ]);
    expect(result.today.groups.find((group) => group.group === 'detection')?.totalTokens).toBe(20);
    expect(result.today.groups.find((group) => group.group === 'investigation')?.totalTokens).toBe(
      10
    );
    expect(result.today.groups.find((group) => group.group === 'ki_extraction')?.totalTokens).toBe(
      20
    );
    expect(result.today.groups.find((group) => group.group === 'memory')?.totalTokens).toBe(60);
  });

  it('prices prompt, cached, completion, and thinking tokens and clamps cached > prompt', async () => {
    const priced = featureBucket({
      featureTotal: 1600,
      models: [
        modelBucket({
          key: GPT_54,
          total: 1550,
          prompt: 1000,
          cached: 200,
          completion: 300,
          thinking: 50,
        }),
      ],
    });
    const clamped = featureBucket({
      featureTotal: 200,
      models: [modelBucket({ key: SONNET, total: 200, prompt: 100, cached: 150, completion: 50 })],
    });
    const esClient = createEsClient((params) => {
      const { gte } = rangeOf(params);
      const features =
        gte === TODAY_START
          ? { [SIGNIFICANT_EVENTS_DISCOVERY_INFERENCE_FEATURE_ID]: priced }
          : { [SIGNIFICANT_EVENTS_INVESTIGATION_INFERENCE_FEATURE_ID]: clamped };
      return {
        aggregations: aggregations({
          total: gte === TODAY_START ? 1550 : 200,
          features,
        }),
      };
    });

    const result = await calculate({ esClient });
    const detection = result.today.groups.find((group) => group.group === 'detection');
    expect(detection?.estimatedCost).toBeCloseTo((800 * 3.75 + 200 * 0.375 + 350 * 21) / 1_000_000);
    const investigation = result.month.groups.find((group) => group.group === 'investigation');
    expect(investigation?.estimatedCost).toBeGreaterThanOrEqual(0);
    expect(investigation?.estimatedCost).toBeCloseTo((0 * 4.5 + 150 * 0.45 + 50 * 21) / 1_000_000);
  });

  it('keeps missing cache-read priceable when cached tokens are zero and partial when they are not', async () => {
    const zeroCached = featureBucket({
      featureTotal: 100,
      models: [modelBucket({ key: NO_CACHE, total: 100, prompt: 40, completion: 60 })],
    });
    const positiveCached = featureBucket({
      featureTotal: 100,
      models: [modelBucket({ key: NO_CACHE, total: 100, prompt: 40, cached: 10, completion: 50 })],
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
    const today = result.today.groups.find((group) => group.group === 'detection');
    expect(today).toMatchObject({ status: 'complete', priceableTokens: 100, unpriceableTokens: 0 });
    expect(today?.estimatedCost).toBeCloseTo((40 * 1 + 60 * 2) / 1_000_000);

    const month = result.month.groups.find((group) => group.group === 'detection');
    expect(month).toMatchObject({
      status: 'partial',
      priceableTokens: 90,
      unpriceableTokens: 10,
    });
    expect(month?.estimatedCost).toBeCloseTo((30 * 1 + 50 * 2) / 1_000_000);
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
    const detection = result.today.groups.find((group) => group.group === 'detection');
    expect(detection).toMatchObject({
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

  it('quantifies terms truncation without double-counting missing-model tokens', async () => {
    const esClient = createEsClient(() => ({
      aggregations: aggregations({
        total: 100,
        features: {
          [SIGNIFICANT_EVENTS_DISCOVERY_INFERENCE_FEATURE_ID]: featureBucket({
            featureTotal: 100,
            models: [modelBucket({ key: SONNET, total: 60, prompt: 60 })],
            missing: 40,
            sumOther: 3,
          }),
        },
      }),
    }));

    const result = await calculate({ esClient });
    const detection = result.today.groups.find((group) => group.group === 'detection');
    expect(detection).toMatchObject({
      status: 'partial',
      unpriceableTokens: 40,
      priceableTokens: 60,
    });
    expect(detection?.estimatedCost).not.toBeNull();
  });

  it('counts GPT-5.4 prompt crossings above 272,000 and ignores the same prompt on a flat model', async () => {
    const esClient = createEsClient(() => ({
      aggregations: aggregations({
        total: 20,
        features: {
          [SIGNIFICANT_EVENTS_DISCOVERY_INFERENCE_FEATURE_ID]: featureBucket({
            featureTotal: 10,
            models: [modelBucket({ key: GPT_54, total: 10, prompt: 300_000 })],
            crossings: { [GPT_54]: { doc_count: 4 }, [SONNET]: { doc_count: 9 } },
          }),
          [SIGNIFICANT_EVENTS_INVESTIGATION_INFERENCE_FEATURE_ID]: featureBucket({
            featureTotal: 10,
            models: [modelBucket({ key: SONNET, total: 10, prompt: 300_000 })],
            crossings: { [SONNET]: { doc_count: 9 } },
          }),
        },
      }),
    }));

    const result = await calculate({ esClient });
    expect(
      result.today.groups.find((group) => group.group === 'detection')?.tierCrossingCount
    ).toBe(4);
    expect(
      result.today.groups.find((group) => group.group === 'investigation')?.tierCrossingCount
    ).toBe(0);
    expect(result.caveats).toContain('tier_crossings_detected');
  });

  it('returns complete zero cost, partial numeric floors, and null when nothing is priceable', async () => {
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
      unpriceable.today.groups.find((group) => group.group === 'detection')?.estimatedCost
    ).toBeNull();
    expect(unpriceable.today.totalStatus).toBe('partial');
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
    expect(unavailable.today.groups.every((group) => group.status === 'unavailable')).toBe(true);
    expect(unavailable.today.totalEstimatedCost).toBeNull();
  });

  it('keeps caveat order and appends conditional caveats', async () => {
    const esClient = createEsClient(() => ({
      aggregations: aggregations({
        total: 10,
        features: {
          [SIGNIFICANT_EVENTS_DISCOVERY_INFERENCE_FEATURE_ID]: featureBucket({
            featureTotal: 10,
            models: [modelBucket({ key: GPT_54, total: 10, prompt: 300_000 })],
            crossings: { [GPT_54]: { doc_count: 1 } },
          }),
        },
      }),
    }));
    const result = await calculate({ esClient, pricesStale: true });
    expect(result.caveats).toEqual([
      'eis_pricing_assumed',
      'usd_assumed',
      'excludes_embeddings',
      'excludes_failed_calls',
      'excludes_cache_writes',
      'tracking_not_all_spaces',
      'prices_stale',
      'tier_crossings_detected',
    ]);
  });

  it('builds structured unavailable responses for missing prices', () => {
    const response = createUnavailableCostResponse({
      now: NOW,
      reason: 'pricing',
      pricesFetchedAt: null,
      pricesStale: false,
    });
    expect(response.unavailableReason).toBe('pricing');
    expect(response.pricesFetchedAt).toBeNull();
    expect(response.today.groups.every((group) => group.status === 'unavailable')).toBe(true);
    expect(response.today.totalTokens).toBe(0);
  });
});
