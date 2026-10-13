/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { estypes } from '@elastic/elasticsearch';
import type { ElasticsearchClient } from '@kbn/core/server';
import { isResponseError } from '@kbn/es-errors';
import type { SpendSource, UsageRecord } from './types';

export const WORKFLOW_EXECUTIONS_INDEX = '.workflows-executions';
export const WORKFLOW_EXECUTIONS_SPEND_SOURCE_ID = 'workflow_executions';

const UNKNOWN_CONNECTOR = '__unknown__';
/** Bounded by `MAX_AI_INDICES` × `MAX_AI_INDEX_AUTOMATIONS`. */
const MAX_WORKFLOW_BUCKETS = 10_000;
const MAX_CONNECTOR_BUCKETS = 100;

interface SumAgg {
  value: number | null;
}

interface ConnectorBucket {
  key: string;
  input: SumAgg;
  output: SumAgg;
  cached: SumAgg;
}

interface WorkflowBucket {
  key: string;
  input: SumAgg;
  output: SumAgg;
  cached: SumAgg;
  steps: { by_connector: { buckets: ConnectorBucket[] } };
}

interface UsageAggregations {
  by_workflow: { buckets: WorkflowBucket[] };
}

const sumAggs = (prefix: string): Record<string, estypes.AggregationsAggregationContainer> => ({
  input: { sum: { field: `${prefix}inputTokens` } },
  output: { sum: { field: `${prefix}outputTokens` } },
  cached: { sum: { field: `${prefix}cachedTokens` } },
});

const toTokens = (bucket: Pick<ConnectorBucket, 'input' | 'output' | 'cached'>) => ({
  inputTokens: bucket.input.value ?? 0,
  outputTokens: bucket.output.value ?? 0,
  cachedTokens: bucket.cached.value ?? 0,
});

/**
 * Spend of the workflows attached to AI indices as automations, read from the token usage
 * the workflow engine records on each execution. Per-step usage carries the connector, so it
 * can be priced; usage a step reported without a connector is kept as unpriced.
 */
export const createWorkflowExecutionsSpendSource = ({
  getEsClient,
}: {
  getEsClient: () => ElasticsearchClient;
}): SpendSource => ({
  id: WORKFLOW_EXECUTIONS_SPEND_SOURCE_ID,
  bucket: 'automations',
  getUsage: async ({ spaceId, from, to, aiIndices }) => {
    const aiIndexByWorkflowId = new Map<string, string>();
    for (const { id, automationWorkflowIds } of aiIndices) {
      for (const workflowId of automationWorkflowIds) {
        aiIndexByWorkflowId.set(workflowId, id);
      }
    }
    if (aiIndexByWorkflowId.size === 0) {
      return [];
    }

    let response: estypes.SearchResponse<unknown, UsageAggregations>;
    try {
      response = await getEsClient().search<unknown, UsageAggregations>({
        index: WORKFLOW_EXECUTIONS_INDEX,
        size: 0,
        track_total_hits: false,
        ignore_unavailable: true,
        query: {
          bool: {
            filter: [
              { term: { spaceId } },
              { terms: { workflowId: [...aiIndexByWorkflowId.keys()] } },
              { range: { createdAt: { gte: from.toISOString(), lt: to.toISOString() } } },
            ],
          },
        },
        aggs: {
          by_workflow: {
            terms: { field: 'workflowId', size: MAX_WORKFLOW_BUCKETS },
            aggs: {
              ...sumAggs('usage.'),
              steps: {
                nested: { path: 'stepUsage' },
                aggs: {
                  by_connector: {
                    terms: {
                      field: 'stepUsage.connectorId',
                      size: MAX_CONNECTOR_BUCKETS,
                      missing: UNKNOWN_CONNECTOR,
                    },
                    aggs: sumAggs('stepUsage.'),
                  },
                },
              },
            },
          },
        },
      });
    } catch (error) {
      if (isResponseError(error) && error.statusCode === 404) {
        return [];
      }
      throw error;
    }

    const records: UsageRecord[] = [];
    for (const workflowBucket of response.aggregations?.by_workflow.buckets ?? []) {
      const aiIndexId = aiIndexByWorkflowId.get(workflowBucket.key);
      if (!aiIndexId) {
        continue;
      }
      const stepTotals = { inputTokens: 0, outputTokens: 0, cachedTokens: 0 };
      for (const connectorBucket of workflowBucket.steps.by_connector.buckets) {
        const tokens = toTokens(connectorBucket);
        stepTotals.inputTokens += tokens.inputTokens;
        stepTotals.outputTokens += tokens.outputTokens;
        stepTotals.cachedTokens += tokens.cachedTokens;
        records.push({
          aiIndexId,
          ...(connectorBucket.key !== UNKNOWN_CONNECTOR && { connectorId: connectorBucket.key }),
          ...tokens,
        });
      }
      // Usage on the execution aggregate that no step itemized (older executions) is unpriced.
      const executionTotals = toTokens(workflowBucket);
      const remainder = {
        inputTokens: Math.max(0, executionTotals.inputTokens - stepTotals.inputTokens),
        outputTokens: Math.max(0, executionTotals.outputTokens - stepTotals.outputTokens),
        cachedTokens: Math.max(0, executionTotals.cachedTokens - stepTotals.cachedTokens),
      };
      if (remainder.inputTokens + remainder.outputTokens > 0) {
        records.push({ aiIndexId, ...remainder });
      }
    }
    return records;
  },
});
