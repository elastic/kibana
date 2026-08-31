/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import { loggingSystemMock } from '@kbn/core/server/mocks';
import {
  SIGNIFICANT_EVENTS_DISCOVERY_INFERENCE_FEATURE_ID,
  SIGNIFICANT_EVENTS_INVESTIGATION_INFERENCE_FEATURE_ID,
  SIGNIFICANT_EVENTS_MEMORY_INFERENCE_FEATURE_ID,
} from '@kbn/significant-events-schema';
import type { InferenceServiceMap } from './inference_service_map';
import type { InferencePrice, PriceServiceResult } from './price_service';
import {
  aggregateSignificantEventsTokenCost,
  calculateTokenCost,
  type CostPeriod,
  type TokenCounts,
} from './cost_service';
import type { SpaceTrackingCoverage } from './space_coverage';

const NOW = '2026-08-31T12:00:00.000Z';
const PERIOD: CostPeriod = {
  kind: 'today',
  start: '2026-08-31T00:00:00.000Z',
  end: '2026-09-01T00:00:00.000Z',
};

const price = (
  modelId: string,
  operation: InferencePrice['operation'],
  unitAmount: number,
  tier: InferencePrice['promptTier'] = {
    raw: null,
    threshold: null,
    direction: 'flat',
  }
): InferencePrice => ({
  modelId,
  operation,
  promptTier: tier,
  unitAmount,
  unit: '1M Token',
});

const modelAPrices = [
  price('model-a', 'input', 2),
  price('model-a', 'cache_read', 1),
  price('model-a', 'output', 10),
];
const modelBPrices = [
  price('model-b', 'input', 4),
  price('model-b', 'cache_read', 2),
  price('model-b', 'output', 20),
];
const flatClaudePrices = [
  price('anthropic-claude-4.6-sonnet', 'input', 3),
  price('anthropic-claude-4.6-sonnet', 'output', 15),
];
const tieredGptPrices = [
  price('openai-gpt-5.4', 'input', 2.5, {
    raw: '<=272k',
    threshold: 272000,
    direction: 'up_to',
  }),
  price('openai-gpt-5.4', 'input', 5, {
    raw: '>272k',
    threshold: 272000,
    direction: 'above',
  }),
  price('openai-gpt-5.4', 'output', 15, {
    raw: '<=272k',
    threshold: 272000,
    direction: 'up_to',
  }),
  price('openai-gpt-5.4', 'output', 30, {
    raw: '>272k',
    threshold: 272000,
    direction: 'above',
  }),
];

const priceResult = (
  prices: InferencePrice[] = [...modelAPrices, ...modelBPrices],
  stale = false
): PriceServiceResult => ({
  catalog: {
    pricesByModel: new Map(
      [...new Set(prices.map(({ modelId }) => modelId))].map((modelId) => [
        modelId,
        prices.filter((candidate) => candidate.modelId === modelId),
      ])
    ),
    effectiveAt: NOW,
    currency: { code: 'USD', symbol: '$', assumed: true, unit: '1M Token' },
  },
  fetchedAt: NOW,
  stale,
});

const completeSpaceCoverage = (
  overrides: Partial<SpaceTrackingCoverage> = {}
): SpaceTrackingCoverage => ({
  spaces: [{ id: 'default', name: 'Default', tracking: 'enabled' }],
  currentSpaceTracking: 'enabled',
  coveredSpaceCount: 1,
  totalSpaceCount: 1,
  unavailableSpaceCount: 0,
  allSpacesTracked: true,
  fullTrackingSince: '2026-08-01T00:00:00.000Z',
  auditUnavailable: false,
  auditScope: 'significant_events_control_only',
  untrackedSpaces: [],
  newSpaces: [],
  ...overrides,
});

const serviceMap = (
  entries: Array<[string, { service: string; model?: string; priceable: boolean }]> = [
    ['connector-a', { service: 'elastic', model: 'model-a', priceable: true }],
    ['connector-b', { service: 'elastic', model: 'model-b', priceable: true }],
  ]
): InferenceServiceMap => new Map(entries);

const tokenCell = ({
  connectorId,
  modelId,
  prompt,
  cached = 0,
  completion,
  thinking = 0,
}: {
  connectorId: string;
  modelId: string;
  prompt: number;
  cached?: number;
  completion: number;
  thinking?: number;
}) => ({
  key: [connectorId, modelId],
  doc_count: 1,
  prompt_tokens: { value: prompt },
  cached_tokens: { value: cached },
  completion_tokens: { value: completion },
  thinking_tokens: { value: thinking },
});

const featureBucket = (buckets: ReturnType<typeof tokenCell>[], sumOtherDocCount = 0) => ({
  doc_count: buckets.length,
  connector_model: {
    buckets,
    sum_other_doc_count: sumOtherDocCount,
  },
});

const esClientFor = (
  buckets: Record<string, ReturnType<typeof featureBucket>>,
  tierCrossings: Record<string, { doc_count: number }> = {}
) => {
  const search = jest.fn().mockResolvedValue({
    aggregations: {
      feature_buckets: { buckets },
      tier_crossings: { buckets: tierCrossings },
    },
  });
  return {
    client: { search } as unknown as ElasticsearchClient,
    search,
  };
};

describe('calculateTokenCost', () => {
  it('subtracts cached prompt tokens and prices thinking tokens as output', () => {
    const tokens: TokenCounts = {
      prompt: 100,
      cached: 40,
      completion: 10,
      thinking: 5,
    };

    expect(calculateTokenCost({ tokens, modelPrices: modelAPrices })).toEqual({
      estimatedCost: 310 / 1_000_000,
      pricedTokenCount: 115,
      unpricedTokenCount: 0,
      missingOperations: [],
      invalid: false,
    });
  });

  it('charges no full-rate input when every prompt token is cached', () => {
    const withoutInput = modelAPrices.filter(({ operation }) => operation !== 'input');

    expect(
      calculateTokenCost({
        tokens: { prompt: 100, cached: 100, completion: 0, thinking: 0 },
        modelPrices: withoutInput,
      })
    ).toEqual({
      estimatedCost: 100 / 1_000_000,
      pricedTokenCount: 100,
      unpricedTokenCount: 0,
      missingOperations: [],
      invalid: false,
    });
  });
});

describe('aggregateSignificantEventsTokenCost', () => {
  const logger = loggingSystemMock.createLogger();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('prices mixed models separately and uses only the token index for totals', async () => {
    const { client, search } = esClientFor({
      [SIGNIFICANT_EVENTS_DISCOVERY_INFERENCE_FEATURE_ID]: featureBucket([
        tokenCell({
          connectorId: 'connector-a',
          modelId: 'model-a',
          prompt: 100,
          cached: 40,
          completion: 10,
          thinking: 5,
        }),
        tokenCell({
          connectorId: 'connector-b',
          modelId: 'model-b',
          prompt: 200,
          completion: 20,
        }),
      ]),
    });

    const result = await aggregateSignificantEventsTokenCost({
      esClient: client,
      priceResult: priceResult(),
      serviceMap: serviceMap(),
      spaceCoverage: completeSpaceCoverage(),
      period: PERIOD,
      logger,
    });

    expect(result.source).toBe('token_index');
    expect(result.groups.detection.coverage).toBe('partial');
    expect(result.groups.detection.estimatedCost).toBeCloseTo(310 / 1_000_000 + 1200 / 1_000_000);
    expect(result.total.estimatedCost).toBe(result.groups.detection.estimatedCost);
    expect(result.groups.memory).toMatchObject({
      coverage: 'unavailable',
      estimatedCost: null,
    });
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('5 thinking tokens'));

    const request = search.mock.calls[0][0];
    expect(request.query.bool.filter).toContainEqual({
      term: { 'inference.parent_feature_id': 'significant_events' },
    });
    expect(JSON.stringify(request)).not.toContain('agent_builder');
    expect(request.aggs.feature_buckets.filters.filters).toHaveProperty(
      SIGNIFICANT_EVENTS_DISCOVERY_INFERENCE_FEATURE_ID
    );
  });

  it('marks non-EIS, unresolved, and truncated usage as floors rather than complete figures', async () => {
    const { client } = esClientFor({
      [SIGNIFICANT_EVENTS_INVESTIGATION_INFERENCE_FEATURE_ID]: featureBucket(
        [
          tokenCell({
            connectorId: 'connector-a',
            modelId: 'model-a',
            prompt: 100,
            completion: 10,
          }),
          tokenCell({
            connectorId: 'byo',
            modelId: 'model-b',
            prompt: 100,
            completion: 10,
          }),
          tokenCell({
            connectorId: 'self-hosted',
            modelId: 'model-b',
            prompt: 100,
            completion: 10,
          }),
        ],
        1
      ),
      [SIGNIFICANT_EVENTS_MEMORY_INFERENCE_FEATURE_ID]: featureBucket([
        tokenCell({
          connectorId: 'deleted',
          modelId: 'model-b',
          prompt: 100,
          completion: 10,
        }),
      ]),
    });

    const result = await aggregateSignificantEventsTokenCost({
      esClient: client,
      priceResult: priceResult(),
      serviceMap: serviceMap([
        ['connector-a', { service: 'elastic', model: 'model-a', priceable: true }],
        ['byo', { service: 'openai', model: 'model-b', priceable: false }],
        ['self-hosted', { service: 'elasticsearch', model: 'model-b', priceable: false }],
      ]),
      spaceCoverage: completeSpaceCoverage(),
      period: PERIOD,
      logger,
    });

    expect(result.groups.investigation).toMatchObject({
      coverage: 'partial',
      truncated: true,
      nonEisConnectorIds: ['byo', 'self-hosted'],
      byoConnectorIds: ['byo'],
      selfHostedConnectorIds: ['self-hosted'],
    });
    expect(result.groups.investigation.estimatedCost).toBeGreaterThan(0);
    expect(result.groups.memory).toMatchObject({
      coverage: 'unavailable',
      estimatedCost: null,
      unpricedConnectorIds: ['deleted'],
    });
    expect(result.total.coverage).toBe('partial');
  });

  it('includes unknown Significant Events feature ids only in the headline and raises an alarm', async () => {
    const { client } = esClientFor({
      __unknown_feature__: {
        ...featureBucket([
          tokenCell({
            connectorId: 'connector-a',
            modelId: 'model-a',
            prompt: 100,
            completion: 10,
          }),
        ]),
        doc_count: 4,
      },
    });

    const result = await aggregateSignificantEventsTokenCost({
      esClient: client,
      priceResult: priceResult(),
      serviceMap: serviceMap(),
      spaceCoverage: completeSpaceCoverage(),
      period: PERIOD,
      logger,
    });

    expect(result.unknownFeatureDocumentCount).toBe(4);
    expect(result.total.estimatedCost).toBeGreaterThan(0);
    expect(result.total.coverage).toBe('partial');
    expect(result.groups.detection.estimatedCost).toBeNull();
    expect(logger.error).toHaveBeenCalledWith(
      expect.stringContaining('unknown inference feature ids')
    );
  });

  it('detects crossings only for models with parsed tiers', async () => {
    const { client, search } = esClientFor({}, { 'openai-gpt-5.4:272000': { doc_count: 2 } });

    const result = await aggregateSignificantEventsTokenCost({
      esClient: client,
      priceResult: priceResult([...tieredGptPrices, ...flatClaudePrices]),
      serviceMap: serviceMap(),
      spaceCoverage: completeSpaceCoverage(),
      period: PERIOD,
      logger,
    });

    expect(result.tierCrossings).toEqual([
      { modelId: 'openai-gpt-5.4', threshold: 272000, documentCount: 2 },
    ]);
    const tierFilters = search.mock.calls[0][0].aggs.tier_crossings.filters.filters;
    expect(Object.keys(tierFilters)).toContain('openai-gpt-5.4:272000');
    expect(Object.keys(tierFilters)).not.toContain('anthropic-claude-4.6-sonnet:272000');
    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining('2 openai-gpt-5.4 calls above the 272000-token lower-price tier')
    );
  });

  it('withholds month-to-date and zero-dollar claims without a full audit watermark', async () => {
    const { client } = esClientFor({});

    const result = await aggregateSignificantEventsTokenCost({
      esClient: client,
      priceResult: priceResult(),
      serviceMap: serviceMap(),
      spaceCoverage: completeSpaceCoverage({ fullTrackingSince: undefined }),
      period: {
        kind: 'month',
        start: '2026-08-01T00:00:00.000Z',
        end: '2026-09-01T00:00:00.000Z',
      },
      logger,
    });

    expect(result.period.label).toBe('unverified_period');
    expect(result.period.fullCoverage).toBe(false);
    expect(result.total).toMatchObject({
      coverage: 'unavailable',
      estimatedCost: null,
      tokens: { prompt: 0, cached: 0, completion: 0, thinking: 0 },
      pricedTokenCount: 0,
    });
  });

  it('hides cost in a current space where token tracking is disabled', async () => {
    const { client } = esClientFor({
      [SIGNIFICANT_EVENTS_DISCOVERY_INFERENCE_FEATURE_ID]: featureBucket([
        tokenCell({
          connectorId: 'connector-a',
          modelId: 'model-a',
          prompt: 100,
          completion: 10,
        }),
      ]),
    });

    const result = await aggregateSignificantEventsTokenCost({
      esClient: client,
      priceResult: priceResult(),
      serviceMap: serviceMap(),
      spaceCoverage: completeSpaceCoverage({
        currentSpaceTracking: 'disabled',
        allSpacesTracked: false,
        coveredSpaceCount: 0,
        untrackedSpaces: [{ id: 'default', name: 'Default' }],
      }),
      period: PERIOD,
      logger,
    });

    expect(result.total).toMatchObject({
      coverage: 'unavailable',
      estimatedCost: null,
    });
    expect(result.groups.detection).toMatchObject({
      coverage: 'unavailable',
      estimatedCost: null,
    });
  });

  it('uses the audit watermark for the MTD label without claiming complete coverage', async () => {
    const { client } = esClientFor({});

    const result = await aggregateSignificantEventsTokenCost({
      esClient: client,
      priceResult: priceResult(),
      serviceMap: serviceMap(),
      spaceCoverage: completeSpaceCoverage(),
      period: {
        kind: 'month',
        start: '2026-08-01T00:00:00.000Z',
        end: '2026-09-01T00:00:00.000Z',
      },
      logger,
    });

    expect(result.period).toMatchObject({
      label: 'month_to_date',
      fullCoverage: false,
      coveredSince: '2026-08-01T00:00:00.000Z',
    });
    expect(result.total).toMatchObject({
      coverage: 'unavailable',
      estimatedCost: null,
    });
  });
});
