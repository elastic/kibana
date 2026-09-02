/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import { RUN_BUDGET_GROUP_IDS, type RunBudgetGroupId } from '../../../common/run_quotas';
import {
  SIGNIFICANT_EVENTS_DISCOVERY_WORKFLOW_ID,
  SIGNIFICANT_EVENTS_KI_ONBOARDING_WORKFLOW_ID,
} from '@kbn/workflows/managed';
import type { InferenceServiceMap } from './inference_service_map';
import type { InferencePrice, PriceServiceResult } from './price_service';
import type { CostFigure, CostPeriod, TokenIndexCostResult } from './cost_service';
import { detectTrackingGapRanges, getWorkflowAttribution } from './workflow_attribution';

const PERIOD: CostPeriod = {
  kind: 'month',
  start: '2026-08-01T00:00:00.000Z',
  end: '2026-09-01T00:00:00.000Z',
};

const prices: InferencePrice[] = [
  {
    modelId: 'model-a',
    operation: 'input',
    promptTier: { raw: null, threshold: null, direction: 'flat' },
    unitAmount: 2,
    unit: '1M Token',
  },
  {
    modelId: 'model-a',
    operation: 'cache_read',
    promptTier: { raw: null, threshold: null, direction: 'flat' },
    unitAmount: 1,
    unit: '1M Token',
  },
  {
    modelId: 'model-a',
    operation: 'output',
    promptTier: { raw: null, threshold: null, direction: 'flat' },
    unitAmount: 10,
    unit: '1M Token',
  },
];

const priceResult: PriceServiceResult = {
  catalog: {
    pricesByModel: new Map([['model-a', prices]]),
    effectiveAt: '2026-08-31T12:00:00.000Z',
    currency: { code: 'USD', symbol: '$', assumed: true, unit: '1M Token' },
  },
  fetchedAt: '2026-08-31T12:00:00.000Z',
  stale: false,
};

const serviceMap: InferenceServiceMap = new Map([
  ['connector-a', { service: 'elastic', model: 'model-a', priceable: true }],
]);

const figure = (overrides: Partial<CostFigure> = {}): CostFigure => ({
  estimatedCost: 0,
  coverage: 'complete',
  tokens: { prompt: 0, cached: 0, completion: 0, thinking: 0 },
  pricedTokenCount: 0,
  unpricedTokenCount: 0,
  nonEisTokenCount: 0,
  unpricedConnectorIds: [],
  nonEisConnectorIds: [],
  byoConnectorIds: [],
  selfHostedConnectorIds: [],
  missingModelIds: [],
  truncated: false,
  ...overrides,
});

const tokenIndexResult = (
  overrides: Partial<Record<RunBudgetGroupId, CostFigure>> = {}
): TokenIndexCostResult => {
  const groups = Object.fromEntries(
    RUN_BUDGET_GROUP_IDS.map((group) => [group, overrides[group] ?? figure()])
  ) as Record<RunBudgetGroupId, CostFigure>;
  return {
    source: 'token_index',
    period: { ...PERIOD, label: 'month_to_date', fullCoverage: true },
    total: figure(),
    groups,
    unknownFeatureDocumentCount: 0,
    tierCrossings: [],
    priceStale: false,
    priceUnavailable: false,
    serviceMapStale: false,
    serviceMapUnavailable: false,
    priceFetchedAt: '2026-08-31T12:00:00.000Z',
    currency: { code: 'USD', symbol: '$', assumed: true, unit: '1M Token' },
    knownGaps: [
      'mid_stream_failures_unrecorded',
      'non_chat_inference_excluded',
      'token_index_write_failures_unrecorded',
      'cache_write_tokens_unavailable',
      'tracking_changes_outside_control_unobserved',
    ],
  };
};

const stepBucket = ({
  stepId,
  connectorId,
  input,
  output,
  cached = 0,
}: {
  stepId: string;
  connectorId: string;
  input: number;
  output: number;
  cached?: number;
}) => ({
  key: [stepId, connectorId],
  input_tokens: { value: input },
  output_tokens: { value: output },
  cached_tokens: { value: cached },
});

const createClient = ({
  attributionBuckets,
  workflowByDay = [],
  tokenIndexByDay = [],
}: {
  attributionBuckets: Record<string, unknown>;
  workflowByDay?: Array<{ day: string; tokens: number }>;
  tokenIndexByDay?: Array<{ day: string; tokens: number }>;
}) => {
  interface MockSearchRequest {
    index: string;
    aggs: {
      by_workflow?: {
        filters: { filters: Record<string, unknown> };
      };
      by_day?: unknown;
    };
    query?: {
      bool: {
        filter: unknown[];
        must_not: unknown[];
      };
    };
  }
  const search = jest.fn(async (request: MockSearchRequest) => {
    if (request.aggs.by_workflow) {
      return {
        aggregations: {
          by_workflow: { buckets: attributionBuckets },
        },
      };
    }
    const buckets = (
      request.index === '.workflows-executions' ? workflowByDay : tokenIndexByDay
    ).map(({ day, tokens }) => ({
      key_as_string: `${day}T00:00:00.000Z`,
      tokens: { value: tokens },
    }));
    return { aggregations: { by_day: { buckets } } };
  });
  return {
    client: { search } as unknown as ElasticsearchClient,
    search,
  };
};

describe('getWorkflowAttribution', () => {
  it('prices nested multi-step usage without adding it to token-index totals', async () => {
    const { client, search } = createClient({
      attributionBuckets: {
        [SIGNIFICANT_EVENTS_DISCOVERY_WORKFLOW_ID]: {
          step_usage: {
            by_step_connector: {
              buckets: [
                stepBucket({
                  stepId: 'discover',
                  connectorId: 'connector-a',
                  input: 100,
                  output: 10,
                  cached: 40,
                }),
                stepBucket({
                  stepId: 'judge',
                  connectorId: 'connector-a',
                  input: 200,
                  output: 20,
                }),
              ],
              sum_other_doc_count: 0,
            },
          },
        },
      },
      workflowByDay: [{ day: '2026-08-10', tokens: 330 }],
      tokenIndexByDay: [{ day: '2026-08-10', tokens: 330 }],
    });
    const tokenIndex = tokenIndexResult({
      detection: figure({
        estimatedCost: 0.00086,
        tokens: { prompt: 300, cached: 40, completion: 30, thinking: 0 },
        pricedTokenCount: 330,
      }),
    });

    const result = await getWorkflowAttribution({
      esClient: client,
      priceResult,
      serviceMap,
      tokenIndex,
      period: PERIOD,
      audit: undefined,
      currentSpaceIds: ['default'],
    });

    expect(result.source).toBe('workflow_step_usage');
    expect(result.groups.detection).toMatchObject({
      status: 'attributed',
      coverage: 'complete',
      tokens: { prompt: 300, cached: 40, completion: 30, thinking: 0 },
      reconciliationRatio: 1,
      inconsistent: false,
      otherPathsTokens: 0,
    });
    expect(result.groups.detection.estimatedCost).toBeCloseTo(0.00086);
    expect(result.groups.detection.workflows[0].steps).toHaveLength(2);
    expect(result.groups.ki_extraction).toMatchObject({
      status: 'not_attributable',
      estimatedCost: null,
    });
    expect(result.trackingGaps).toEqual([]);

    const attributionRequest = search.mock.calls.find(([request]) => request.aggs.by_workflow)?.[0];
    if (!attributionRequest?.query || !attributionRequest.aggs.by_workflow) {
      throw new Error('Expected an attribution search request');
    }
    expect(attributionRequest.query.bool.must_not).toEqual([
      { term: { isTestRun: true } },
      { term: { status: 'skipped' } },
    ]);
    expect(attributionRequest.aggs.by_workflow.filters.filters).toHaveProperty(
      SIGNIFICANT_EVENTS_KI_ONBOARDING_WORKFLOW_ID
    );
    const gapRequest = search.mock.calls.find(
      ([request]) => request.index === '.workflows-executions' && request.aggs.by_day
    )?.[0];
    expect(gapRequest?.query?.bool.filter).toContainEqual({
      range: {
        createdAt: {
          gte: PERIOD.start,
          lt: PERIOD.end,
        },
      },
    });
  });

  it('reports unresolvable connectors and clamps negative other paths to zero', async () => {
    const { client } = createClient({
      attributionBuckets: {
        [SIGNIFICANT_EVENTS_DISCOVERY_WORKFLOW_ID]: {
          step_usage: {
            by_step_connector: {
              buckets: [
                stepBucket({
                  stepId: 'known',
                  connectorId: 'connector-a',
                  input: 200,
                  output: 20,
                }),
                stepBucket({
                  stepId: 'unknown',
                  connectorId: 'deleted-connector',
                  input: 50,
                  output: 5,
                }),
              ],
              sum_other_doc_count: 0,
            },
          },
        },
      },
    });
    const tokenIndex = tokenIndexResult({
      detection: figure({
        estimatedCost: 0.0001,
        tokens: { prompt: 100, cached: 0, completion: 10, thinking: 0 },
        pricedTokenCount: 110,
      }),
    });

    const result = await getWorkflowAttribution({
      esClient: client,
      priceResult,
      serviceMap,
      tokenIndex,
      period: PERIOD,
      audit: undefined,
      currentSpaceIds: ['default'],
    });

    expect(result.groups.detection).toMatchObject({
      coverage: 'partial',
      unpricedConnectorIds: ['deleted-connector'],
      inconsistent: true,
      otherPathsTokens: 0,
      otherPathsEstimatedCost: 0,
    });
    expect(result.groups.detection.estimatedCost).toBeGreaterThan(0);
  });
});

describe('detectTrackingGapRanges', () => {
  it('flags the first workflow-active day without token-index coverage and ignores quiet days', () => {
    expect(
      detectTrackingGapRanges({
        workflowByDay: new Map([
          ['2026-08-10', 100],
          ['2026-08-11', 0],
        ]),
        tokenIndexByDay: new Map([
          ['2026-08-10', 0],
          ['2026-08-11', 0],
        ]),
        audit: undefined,
        currentSpaceIds: ['default'],
        period: PERIOD,
      })
    ).toEqual([
      {
        start: '2026-08-10T00:00:00.000Z',
        end: '2026-08-11T00:00:00.000Z',
        source: 'inferred',
      },
    ]);
  });

  it('uses next-day token surplus for workflows that cross UTC midnight', () => {
    expect(
      detectTrackingGapRanges({
        workflowByDay: new Map([
          ['2026-08-10', 100],
          ['2026-08-11', 40],
        ]),
        tokenIndexByDay: new Map([
          ['2026-08-10', 0],
          ['2026-08-11', 140],
        ]),
        audit: undefined,
        currentSpaceIds: ['default'],
        period: PERIOD,
      })
    ).toEqual([]);
  });

  it('prefers exact audit boundaries over an overlapping inferred day', () => {
    expect(
      detectTrackingGapRanges({
        workflowByDay: new Map([['2026-08-10', 100]]),
        tokenIndexByDay: new Map([['2026-08-10', 0]]),
        audit: {
          knownSpaces: [{ id: 'default', name: 'Default' }],
          events: [
            {
              spaceId: 'default',
              enabled: false,
              changedAt: '2026-08-10T06:00:00.000Z',
              changedBy: 'operator',
            },
            {
              spaceId: 'default',
              enabled: true,
              changedAt: '2026-08-10T18:00:00.000Z',
              changedBy: 'operator',
            },
          ],
        },
        currentSpaceIds: ['default'],
        period: PERIOD,
      })
    ).toEqual([
      {
        start: '2026-08-10T06:00:00.000Z',
        end: '2026-08-10T18:00:00.000Z',
        source: 'audit',
      },
    ]);
  });
});
