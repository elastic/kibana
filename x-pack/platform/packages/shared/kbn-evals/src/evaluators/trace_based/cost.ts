/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client as EsClient } from '@elastic/elasticsearch';
import type { ToolingLog } from '@kbn/tooling-log';
import type { Evaluator } from '../../types';
import { createTraceBasedEvaluator, type EsqlResponse } from './factory';
import {
  estimateCostUsd,
  getModelPrice,
  getTokenRates,
  LONG_CONTEXT_THRESHOLDS,
  PRICE_TABLE_VERSION,
  type TokenUsage,
} from './model_prices';
export const ESTIMATED_COST_EVALUATOR_NAME = 'Estimated Cost (USD)';

const UNKNOWN_MODEL = 'unknown';

const CACHE_READ_FIELD = 'attributes.gen_ai.usage.cache_read.input_tokens';
const CACHE_WRITE_FIELD = 'attributes.gen_ai.usage.cache_write.input_tokens';

interface ModelUsage extends TokenUsage {
  model: string;
  promptTier: number;
  // False when the provider never reported cache reads, so all input is priced as uncached.
  cacheReported: boolean;
  // False when the provider never reported cache writes, so they are priced as uncached input.
  cacheWriteReported: boolean;
  costUsd: number | null;
  unpricedReason?: string;
}

interface CacheColumns {
  withCacheReads: boolean;
  withCacheWrites: boolean;
}

// ES|QL rejects a query naming a field no index maps, and these appear only once a provider
// reported them, so the query only sums the ones the cluster knows about.
const getCacheColumns = async (traceEsClient: EsClient): Promise<CacheColumns> => {
  const { fields } = await traceEsClient.fieldCaps({
    index: 'traces-*',
    fields: [CACHE_READ_FIELD, CACHE_WRITE_FIELD],
    allow_no_indices: true,
    ignore_unavailable: true,
  });

  return {
    withCacheReads: Object.hasOwn(fields, CACHE_READ_FIELD),
    withCacheWrites: Object.hasOwn(fields, CACHE_WRITE_FIELD),
  };
};

// Buckets each request by the largest tier boundary its prompt exceeds (0 below all of them).
// A prompt of exactly the boundary stays in the lower tier, matching the catalog's `<=272K` rows.
const promptTierExpression = `CASE(${LONG_CONTEXT_THRESHOLDS.map(
  (threshold) => `prompt_tokens > ${threshold}, ${threshold}`
).join(', ')}, 0)`;

const buildCostQuery = (traceId: string, { withCacheReads, withCacheWrites }: CacheColumns) => {
  const cacheStats = [
    withCacheReads ? `cached_tokens = SUM(TO_LONG(${CACHE_READ_FIELD})),` : '',
    withCacheWrites ? `cache_write_tokens = SUM(TO_LONG(${CACHE_WRITE_FIELD})),` : '',
  ].join('\n');

  // TO_LONG resolves union types (integer vs long across trace index generations); the null
  // filter must run on the converted column, since a union-typed field can't be referenced
  // directly. The tracer writes "unknown" as the request model when it has no model id, so that
  // falls back too.
  return `FROM traces-*
        | WHERE trace.id == "${traceId}"
        | EVAL prompt_tokens = TO_LONG(attributes.gen_ai.usage.input_tokens)
        | WHERE prompt_tokens IS NOT NULL
        | STATS
        input_tokens = SUM(prompt_tokens),
        ${cacheStats}
        output_tokens = SUM(TO_LONG(attributes.gen_ai.usage.output_tokens))
        BY model = CASE(
          attributes.gen_ai.request.model IS NULL OR attributes.gen_ai.request.model == "${UNKNOWN_MODEL}",
          attributes.gen_ai.response.model,
          attributes.gen_ai.request.model
        ),
        prompt_tier = ${promptTierExpression}`;
};

const priceUsage = (
  usage: TokenUsage,
  model: string,
  promptTier: number
): Pick<ModelUsage, 'costUsd' | 'unpricedReason'> => {
  const price = getModelPrice(model);
  if (!price) {
    return { costUsd: null, unpricedReason: 'no EIS list price' };
  }
  // Input includes cache reads and writes, so more of them than input means inconsistent usage data.
  if (usage.cachedTokens + usage.cacheWriteTokens > usage.inputTokens) {
    return { costUsd: null, unpricedReason: 'cache reads and writes exceed input tokens' };
  }
  return { costUsd: estimateCostUsd(usage, getTokenRates(price, promptTier)) };
};

const parseTraceUsage = ({ columns, values }: EsqlResponse): ModelUsage[] => {
  const columnIndex = (name: string) => columns.findIndex((col) => col.name === name);
  const modelIdx = columnIndex('model');
  const tierIdx = columnIndex('prompt_tier');
  const inputIdx = columnIndex('input_tokens');
  // Absent when no span in the cluster ever reported cache reads or writes.
  const cachedIdx = columnIndex('cached_tokens');
  const cacheWriteIdx = columnIndex('cache_write_tokens');
  const outputIdx = columnIndex('output_tokens');

  return values.map((row): ModelUsage => {
    const model: string = row[modelIdx] ?? UNKNOWN_MODEL;
    const promptTier: number = row[tierIdx] ?? 0;
    const cachedTokens: number | null = cachedIdx >= 0 ? row[cachedIdx] : null;
    const cacheWriteTokens: number | null = cacheWriteIdx >= 0 ? row[cacheWriteIdx] : null;
    const usage: TokenUsage = {
      inputTokens: row[inputIdx],
      cachedTokens: cachedTokens ?? 0,
      cacheWriteTokens: cacheWriteTokens ?? 0,
      outputTokens: row[outputIdx] ?? 0,
    };

    return {
      model,
      promptTier,
      ...usage,
      cacheReported: cachedTokens != null,
      cacheWriteReported: cacheWriteTokens != null,
      ...priceUsage(usage, model, promptTier),
    };
  });
};

const describeModelUsage = ({
  model,
  promptTier,
  inputTokens,
  cachedTokens,
  cacheReported,
  cacheWriteTokens,
  cacheWriteReported,
  outputTokens,
  costUsd,
}: ModelUsage) => {
  const label = promptTier > 0 ? `${model} (prompts >${promptTier / 1000}k)` : model;
  const cacheReads = cacheReported ? `${cachedTokens} cached` : 'cache reads not reported';
  const cacheWrites = cacheWriteReported
    ? `${cacheWriteTokens} cache writes`
    : 'cache writes not reported';
  const cost = costUsd === null ? 'unpriced' : `$${costUsd.toFixed(4)}`;
  return `${label}: ${inputTokens} input (${cacheReads}, ${cacheWrites}), ${outputTokens} output tokens = ${cost}`;
};

export function createEstimatedCostEvaluator({
  traceEsClient,
  log,
}: {
  traceEsClient: EsClient;
  log: ToolingLog;
}): Evaluator {
  return createTraceBasedEvaluator({
    traceEsClient,
    log,
    config: {
      name: ESTIMATED_COST_EVALUATOR_NAME,
      direction: 'minimize',
      emptyResponseIsIncomplete: true,
      buildQuery: async (traceId) => buildCostQuery(traceId, await getCacheColumns(traceEsClient)),
      // A partial sum would understate the cost, so one unpriced model leaves the trace unscored.
      isNotReported: (response) =>
        parseTraceUsage(response).some(({ costUsd }) => costUsd === null),
      extractResult: (response) =>
        parseTraceUsage(response).reduce((total, { costUsd }) => total + (costUsd ?? 0), 0),
      isResultValid: (result) => result !== null && result > 0,
      describeResult: (response) => {
        const usages = parseTraceUsage(response);
        const unpriced = usages
          .filter(({ costUsd }) => costUsd === null)
          .map(({ model, unpricedReason }) => `${model} (${unpricedReason})`);
        const breakdown = usages.map(describeModelUsage).join('; ');

        return {
          explanation:
            unpriced.length > 0
              ? `Could not price ${unpriced.join(', ')}. ${breakdown}`
              : breakdown,
          metadata: { priceTableVersion: PRICE_TABLE_VERSION, models: usages },
        };
      },
    },
  });
}
