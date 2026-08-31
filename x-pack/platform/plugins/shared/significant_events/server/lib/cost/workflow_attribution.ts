/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import type { AggregationsAggregationContainer } from '@elastic/elasticsearch/lib/api/types';
import { SIGNIFICANT_EVENTS_INFERENCE_PARENT_FEATURE_ID } from '@kbn/significant-events-schema';
import { WORKFLOWS_EXECUTIONS_INDEX } from '@kbn/workflows-management-plugin/common';
import { RUN_BUDGET_GROUP_IDS, type RunBudgetGroupId } from '../../../common/run_quotas';
import { RUN_QUOTA_WORKFLOW_IDS_BY_GROUP } from '../run_quotas/counting';
import type { InferenceServiceMap } from './inference_service_map';
import type { PriceServiceResult } from './price_service';
import {
  calculateTokenCost,
  type CostCoverageState,
  type CostPeriod,
  type TokenCounts,
  type TokenIndexCostResult,
} from './cost_service';
import type { CostTrackingAuditAttributes } from './tracking_audit';

const TOKEN_USAGE_DATA_STREAM = '.kibana-inference-token-usage';
const STEP_BUCKET_LIMIT = 1000;
const MISSING_CONNECTOR = '__missing__';
const RECONCILIATION_RATIO_MIN = 0.9;
const RECONCILIATION_RATIO_MAX = 1.01;
const NEAR_ZERO_INDEX_RATIO = 0.01;
const MILLISECONDS_PER_DAY = 24 * 60 * 60_000;

export interface WorkflowStepAttribution {
  stepId: string;
  connectorId: string;
  tokens: TokenCounts;
  estimatedCost: number | null;
  coverage: CostCoverageState;
}

export interface WorkflowAttribution {
  workflowId: string;
  tokens: TokenCounts;
  estimatedCost: number | null;
  coverage: CostCoverageState;
  steps: WorkflowStepAttribution[];
}

export interface GroupWorkflowAttribution {
  group: RunBudgetGroupId;
  status: 'attributed' | 'not_attributable';
  tokens: TokenCounts;
  estimatedCost: number | null;
  coverage: CostCoverageState;
  workflows: WorkflowAttribution[];
  unpricedConnectorIds: string[];
  reconciliationRatio: number | null;
  inconsistent: boolean;
  otherPathsTokens: number;
  otherPathsEstimatedCost: number | null;
}

export interface TrackingGapRange {
  start: string;
  end: string;
  source: 'inferred' | 'audit';
}

export interface WorkflowAttributionResult {
  source: 'workflow_step_usage';
  groups: Record<RunBudgetGroupId, GroupWorkflowAttribution>;
  trackingGaps: TrackingGapRange[];
}

interface SumAggregation {
  value?: number | null;
}

interface StepBucket {
  key: [string, string];
  input_tokens?: SumAggregation;
  output_tokens?: SumAggregation;
  cached_tokens?: SumAggregation;
}

interface WorkflowBucket {
  step_usage?: {
    by_step_connector?: {
      buckets?: StepBucket[];
      sum_other_doc_count?: number;
    };
  };
}

interface WorkflowAttributionSearchResponse {
  aggregations?: {
    by_workflow?: {
      buckets?: Record<string, WorkflowBucket>;
    };
  };
}

interface DailyUsageBucket {
  key_as_string: string;
  tokens?: SumAggregation;
}

interface DailyUsageSearchResponse {
  aggregations?: {
    by_day?: {
      buckets?: DailyUsageBucket[];
    };
  };
}

const workflowIdsByGroup = Object.fromEntries(
  RUN_BUDGET_GROUP_IDS.map((group) => [group, [...RUN_QUOTA_WORKFLOW_IDS_BY_GROUP[group]]])
) as Record<RunBudgetGroupId, string[]>;

const allWorkflowIds = [...new Set(Object.values(workflowIdsByGroup).flat())];

const emptyTokens = (): TokenCounts => ({
  prompt: 0,
  cached: 0,
  completion: 0,
  thinking: 0,
});

const addTokens = (left: TokenCounts, right: TokenCounts): TokenCounts => ({
  prompt: left.prompt + right.prompt,
  cached: left.cached + right.cached,
  completion: left.completion + right.completion,
  thinking: 0,
});

const billableTokens = ({ prompt, completion, thinking }: TokenCounts): number =>
  prompt + completion + thinking;

const sumValue = (aggregation: SumAggregation | undefined): number => {
  const value = aggregation?.value ?? 0;
  return Number.isFinite(value) && value >= 0 ? value : 0;
};

const resolveAggregateCoverage = (
  states: CostCoverageState[],
  truncated = false
): CostCoverageState => {
  if (states.length === 0) {
    return truncated ? 'partial' : 'complete';
  }
  if (states.every((state) => state === 'unavailable')) {
    return 'unavailable';
  }
  if (truncated || states.some((state) => state !== 'complete')) {
    return 'partial';
  }
  return 'complete';
};

const priceStep = ({
  bucket,
  serviceMap,
  serviceMapStale,
  priceResult,
}: {
  bucket: StepBucket;
  serviceMap: InferenceServiceMap;
  serviceMapStale: boolean;
  priceResult: PriceServiceResult;
}): WorkflowStepAttribution => {
  const [stepId, connectorId] = bucket.key;
  const tokens: TokenCounts = {
    prompt: sumValue(bucket.input_tokens),
    cached: sumValue(bucket.cached_tokens),
    completion: sumValue(bucket.output_tokens),
    thinking: 0,
  };
  const endpoint = serviceMap.get(connectorId);
  if (!endpoint?.priceable || !endpoint.model) {
    return {
      stepId,
      connectorId,
      tokens,
      estimatedCost: null,
      coverage: 'unavailable',
    };
  }
  const modelPrices = priceResult.catalog.pricesByModel.get(endpoint.model);
  if (!modelPrices) {
    return {
      stepId,
      connectorId,
      tokens,
      estimatedCost: null,
      coverage: 'unavailable',
    };
  }
  const calculation = calculateTokenCost({ tokens, modelPrices });
  const coverage: CostCoverageState =
    calculation.invalid ||
    calculation.unpricedTokenCount > 0 ||
    priceResult.stale ||
    serviceMapStale
      ? 'partial'
      : 'complete';
  return {
    stepId,
    connectorId,
    tokens,
    estimatedCost:
      calculation.estimatedCost > 0 || coverage === 'complete' ? calculation.estimatedCost : null,
    coverage,
  };
};

const workflowGroup = (workflowId: string): RunBudgetGroupId | undefined =>
  RUN_BUDGET_GROUP_IDS.find((group) => workflowIdsByGroup[group].includes(workflowId));

const emptyGroupAttribution = (group: RunBudgetGroupId): GroupWorkflowAttribution => ({
  group,
  status: group === 'ki_extraction' ? 'not_attributable' : 'attributed',
  tokens: emptyTokens(),
  estimatedCost: group === 'ki_extraction' ? null : 0,
  coverage: group === 'ki_extraction' ? 'unavailable' : 'complete',
  workflows: [],
  unpricedConnectorIds: [],
  reconciliationRatio: null,
  inconsistent: false,
  otherPathsTokens: 0,
  otherPathsEstimatedCost: null,
});

const buildAttributionSearchRequest = (period: CostPeriod) => ({
  index: WORKFLOWS_EXECUTIONS_INDEX,
  size: 0,
  allow_no_indices: true,
  ignore_unavailable: true,
  query: {
    bool: {
      filter: [
        { terms: { workflowId: allWorkflowIds } },
        { range: { createdAt: { gte: period.start, lt: period.end } } },
      ],
      must_not: [{ term: { isTestRun: true } }, { term: { status: 'skipped' } }],
    },
  },
  aggs: {
    by_workflow: {
      filters: {
        filters: Object.fromEntries(
          allWorkflowIds.map((workflowId) => [workflowId, { term: { workflowId } }])
        ),
      },
      aggs: {
        step_usage: {
          nested: { path: 'stepUsage' },
          aggs: {
            by_step_connector: {
              multi_terms: {
                terms: [
                  { field: 'stepUsage.stepId', missing: '__missing_step__' },
                  { field: 'stepUsage.connectorId', missing: MISSING_CONNECTOR },
                ],
                size: STEP_BUCKET_LIMIT,
              },
              aggs: {
                input_tokens: { sum: { field: 'stepUsage.inputTokens' } },
                output_tokens: { sum: { field: 'stepUsage.outputTokens' } },
                cached_tokens: { sum: { field: 'stepUsage.cachedTokens' } },
              },
            },
          },
        },
      },
    },
  },
});

const finalizeGroup = ({
  group,
  workflows,
  truncated,
  tokenIndex,
}: {
  group: RunBudgetGroupId;
  workflows: WorkflowAttribution[];
  truncated: boolean;
  tokenIndex: TokenIndexCostResult;
}): GroupWorkflowAttribution => {
  if (group === 'ki_extraction') {
    return emptyGroupAttribution(group);
  }
  const tokens = workflows.reduce(
    (total, workflow) => addTokens(total, workflow.tokens),
    emptyTokens()
  );
  const steps = workflows.flatMap((workflow) => workflow.steps);
  const pricedSteps = steps.filter(
    (step): step is WorkflowStepAttribution & { estimatedCost: number } =>
      step.estimatedCost !== null
  );
  const attributedCost = pricedSteps.reduce((total, step) => total + step.estimatedCost, 0);
  const coverage = resolveAggregateCoverage(
    steps.map((step) => step.coverage),
    truncated
  );
  const attributedTokens = billableTokens(tokens);
  const indexFigure = tokenIndex.groups[group];
  const indexTokens = billableTokens(indexFigure.tokens);
  const reconciliationRatio = indexTokens > 0 ? attributedTokens / indexTokens : null;
  const inconsistent =
    (indexTokens === 0 && attributedTokens > 0) ||
    (reconciliationRatio !== null &&
      (reconciliationRatio < RECONCILIATION_RATIO_MIN ||
        reconciliationRatio > RECONCILIATION_RATIO_MAX));
  const otherPathsEstimatedCost =
    indexFigure.estimatedCost !== null && pricedSteps.length > 0
      ? Math.max(0, indexFigure.estimatedCost - attributedCost)
      : null;

  return {
    group,
    status: 'attributed',
    tokens,
    estimatedCost: pricedSteps.length === 0 && billableTokens(tokens) > 0 ? null : attributedCost,
    coverage,
    workflows,
    unpricedConnectorIds: [
      ...new Set(
        steps
          .filter(({ coverage: stepCoverage }) => stepCoverage !== 'complete')
          .map(({ connectorId }) => connectorId)
      ),
    ].sort(),
    reconciliationRatio,
    inconsistent,
    otherPathsTokens: Math.max(0, indexTokens - attributedTokens),
    otherPathsEstimatedCost,
  };
};

const mergeRanges = (ranges: TrackingGapRange[]): TrackingGapRange[] => {
  const sorted = [...ranges].sort((left, right) => left.start.localeCompare(right.start));
  const merged: TrackingGapRange[] = [];
  for (const range of sorted) {
    const previous = merged.at(-1);
    if (previous && previous.source === range.source && range.start <= previous.end) {
      previous.end = previous.end > range.end ? previous.end : range.end;
    } else {
      merged.push({ ...range });
    }
  }
  return merged;
};

const auditDisabledRanges = ({
  audit,
  currentSpaceIds,
  period,
}: {
  audit: CostTrackingAuditAttributes | undefined;
  currentSpaceIds: readonly string[];
  period: CostPeriod;
}): TrackingGapRange[] => {
  if (!audit) {
    return [];
  }
  const currentSpaces = new Set(currentSpaceIds);
  const eventsBySpace = new Map<string, CostTrackingAuditAttributes['events']>();
  for (const event of audit.events) {
    if (!currentSpaces.has(event.spaceId)) {
      continue;
    }
    const events = eventsBySpace.get(event.spaceId) ?? [];
    events.push(event);
    eventsBySpace.set(event.spaceId, events);
  }
  const ranges: TrackingGapRange[] = [];
  for (const events of eventsBySpace.values()) {
    events.sort((left, right) => left.changedAt.localeCompare(right.changedAt));
    let disabledAt: string | undefined;
    for (const event of events) {
      if (event.changedAt >= period.end) {
        break;
      }
      if (!event.enabled) {
        disabledAt = event.changedAt < period.start ? period.start : event.changedAt;
      } else if (disabledAt) {
        ranges.push({
          start: disabledAt,
          end: event.changedAt,
          source: 'audit',
        });
        disabledAt = undefined;
      }
    }
    if (disabledAt) {
      ranges.push({ start: disabledAt, end: period.end, source: 'audit' });
    }
  }
  return mergeRanges(ranges);
};

export const detectTrackingGapRanges = ({
  workflowByDay,
  tokenIndexByDay,
  audit,
  currentSpaceIds,
  period,
}: {
  workflowByDay: ReadonlyMap<string, number>;
  tokenIndexByDay: ReadonlyMap<string, number>;
  audit: CostTrackingAuditAttributes | undefined;
  currentSpaceIds: readonly string[];
  period: CostPeriod;
}): TrackingGapRange[] => {
  const inferred = [...workflowByDay.entries()].flatMap(
    ([day, workflowTokens]): TrackingGapRange[] => {
      const tokenIndexTokens = tokenIndexByDay.get(day) ?? 0;
      const gap =
        workflowTokens > 0 &&
        (tokenIndexTokens === 0 || tokenIndexTokens / workflowTokens < NEAR_ZERO_INDEX_RATIO);
      if (!gap) {
        return [];
      }
      const start = new Date(day).toISOString();
      return [
        {
          start,
          end: new Date(Date.parse(start) + MILLISECONDS_PER_DAY).toISOString(),
          source: 'inferred',
        },
      ];
    }
  );
  const inferredRanges = mergeRanges(inferred);
  const auditedRanges = auditDisabledRanges({ audit, currentSpaceIds, period });

  return mergeRanges(
    inferredRanges.flatMap((inferredRange) => {
      const overlappingAudit = auditedRanges.filter(
        (auditRange) => auditRange.start < inferredRange.end && auditRange.end > inferredRange.start
      );
      return overlappingAudit.length > 0 ? overlappingAudit : [inferredRange];
    })
  );
};

const dailyUsageMap = (response: DailyUsageSearchResponse): Map<string, number> =>
  new Map(
    (response.aggregations?.by_day?.buckets ?? []).map((bucket) => [
      bucket.key_as_string.slice(0, 10),
      sumValue(bucket.tokens),
    ])
  );

const buildDailyHistogram = ({
  dateField,
  tokenField,
  period,
}: {
  dateField: string;
  tokenField: string;
  period: CostPeriod;
}): Record<string, AggregationsAggregationContainer> => ({
  by_day: {
    date_histogram: {
      field: dateField,
      calendar_interval: 'day',
      min_doc_count: 0,
      extended_bounds: { min: period.start, max: period.end },
    },
    aggs: {
      tokens: { sum: { field: tokenField } },
    },
  },
});

const fetchTrackingGaps = async ({
  esClient,
  period,
  audit,
  currentSpaceIds,
}: {
  esClient: ElasticsearchClient;
  period: CostPeriod;
  audit: CostTrackingAuditAttributes | undefined;
  currentSpaceIds: readonly string[];
}): Promise<TrackingGapRange[]> => {
  const [workflowResponse, tokenIndexResponse] = await Promise.all([
    esClient.search({
      index: WORKFLOWS_EXECUTIONS_INDEX,
      size: 0,
      allow_no_indices: true,
      ignore_unavailable: true,
      query: {
        bool: {
          filter: [
            { terms: { workflowId: allWorkflowIds } },
            { range: { createdAt: { gte: period.start, lt: period.end } } },
          ],
          must_not: [{ term: { isTestRun: true } }, { term: { status: 'skipped' } }],
        },
      },
      aggs: buildDailyHistogram({
        dateField: 'createdAt',
        tokenField: 'usage.totalTokens',
        period,
      }),
    }),
    esClient.search({
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
      aggs: buildDailyHistogram({
        dateField: '@timestamp',
        tokenField: 'token_usage.total_tokens',
        period,
      }),
    }),
  ]);

  return detectTrackingGapRanges({
    workflowByDay: dailyUsageMap(workflowResponse as unknown as DailyUsageSearchResponse),
    tokenIndexByDay: dailyUsageMap(tokenIndexResponse as unknown as DailyUsageSearchResponse),
    audit,
    currentSpaceIds,
    period,
  });
};

export const getWorkflowAttribution = async ({
  esClient,
  priceResult,
  serviceMap,
  serviceMapStale = false,
  tokenIndex,
  period,
  audit,
  currentSpaceIds,
}: {
  esClient: ElasticsearchClient;
  priceResult: PriceServiceResult;
  serviceMap: InferenceServiceMap;
  serviceMapStale?: boolean;
  tokenIndex: TokenIndexCostResult;
  period: CostPeriod;
  audit: CostTrackingAuditAttributes | undefined;
  currentSpaceIds: readonly string[];
}): Promise<WorkflowAttributionResult> => {
  const [attributionResponse, trackingGaps] = await Promise.all([
    esClient.search(buildAttributionSearchRequest(period)),
    fetchTrackingGaps({ esClient, period, audit, currentSpaceIds }),
  ]);
  const workflowBuckets = (attributionResponse as unknown as WorkflowAttributionSearchResponse)
    .aggregations?.by_workflow?.buckets;
  const workflowsByGroup: Record<RunBudgetGroupId, WorkflowAttribution[]> = {
    detection: [],
    investigation: [],
    ki_extraction: [],
    memory: [],
  };
  const truncatedByGroup: Record<RunBudgetGroupId, boolean> = {
    detection: false,
    investigation: false,
    ki_extraction: false,
    memory: false,
  };

  for (const [workflowId, bucket] of Object.entries(workflowBuckets ?? {})) {
    const group = workflowGroup(workflowId);
    if (!group || group === 'ki_extraction') {
      continue;
    }
    const stepBuckets = bucket.step_usage?.by_step_connector;
    const steps = (stepBuckets?.buckets ?? []).map((stepBucket) =>
      priceStep({
        bucket: stepBucket,
        serviceMap,
        serviceMapStale,
        priceResult,
      })
    );
    if (steps.length === 0) {
      continue;
    }
    const tokens = steps.reduce((total, step) => addTokens(total, step.tokens), emptyTokens());
    const coverage = resolveAggregateCoverage(
      steps.map((step) => step.coverage),
      (stepBuckets?.sum_other_doc_count ?? 0) > 0
    );
    const pricedSteps = steps.filter(
      (step): step is WorkflowStepAttribution & { estimatedCost: number } =>
        step.estimatedCost !== null
    );
    const estimatedCost =
      pricedSteps.length === 0 && billableTokens(tokens) > 0
        ? null
        : pricedSteps.reduce((total, step) => total + step.estimatedCost, 0);
    workflowsByGroup[group].push({
      workflowId,
      tokens,
      estimatedCost,
      coverage,
      steps,
    });
    truncatedByGroup[group] =
      truncatedByGroup[group] || (stepBuckets?.sum_other_doc_count ?? 0) > 0;
  }

  return {
    source: 'workflow_step_usage',
    groups: Object.fromEntries(
      RUN_BUDGET_GROUP_IDS.map((group) => [
        group,
        finalizeGroup({
          group,
          workflows: workflowsByGroup[group],
          truncated: truncatedByGroup[group],
          tokenIndex,
        }),
      ])
    ) as Record<RunBudgetGroupId, GroupWorkflowAttribution>,
    trackingGaps,
  };
};
