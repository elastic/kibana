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
  type TokenUsage,
} from './model_prices';
import { CACHE_READ_COLUMN_MISSING } from './tokens';

export const ESTIMATED_COST_EVALUATOR_NAME = 'Estimated Cost (USD)';

const UNKNOWN_MODEL = 'unknown';

interface ModelUsage extends TokenUsage {
  model: string;
  promptTier: number;
  // False when the provider never reported cache reads, so all input is priced as uncached.
  cacheReported: boolean;
  costUsd: number | null;
  unpricedReason?: string;
}

// Buckets each request by the largest tier boundary its prompt exceeds (0 below all of them).
const promptTierExpression = `CASE(${LONG_CONTEXT_THRESHOLDS.map(
  (threshold) => `prompt_tokens > ${threshold}, ${threshold}`
).join(', ')}, 0)`;

const buildCostQuery = (traceId: string, { withCachedTokens }: { withCachedTokens: boolean }) => {
  const cachedTokensStat = withCachedTokens
    ? 'cached_tokens = SUM(TO_LONG(attributes.gen_ai.usage.cache_read.input_tokens)),'
    : '';

  // TO_LONG resolves union types (integer vs long across trace index generations). The tracer
  // writes "unknown" as the request model when it has no model id, so that falls back too.
  return `FROM traces-*
        | WHERE trace.id == "${traceId}"
          AND attributes.gen_ai.usage.input_tokens IS NOT NULL
        | EVAL prompt_tokens = TO_LONG(attributes.gen_ai.usage.input_tokens)
        | STATS
        input_tokens = SUM(prompt_tokens),
        ${cachedTokensStat}
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
  // Input includes cache reads, so more cache reads than input means the usage data is inconsistent.
  if (usage.cachedTokens > usage.inputTokens) {
    return { costUsd: null, unpricedReason: 'cache reads exceed input tokens' };
  }
  return { costUsd: estimateCostUsd(usage, getTokenRates(price, promptTier)) };
};

const parseTraceUsage = ({ columns, values }: EsqlResponse): ModelUsage[] => {
  const columnIndex = (name: string) => columns.findIndex((col) => col.name === name);
  const modelIdx = columnIndex('model');
  const tierIdx = columnIndex('prompt_tier');
  const inputIdx = columnIndex('input_tokens');
  // Absent when the fallback query ran because no span in the cluster ever reported cache reads.
  const cachedIdx = columnIndex('cached_tokens');
  const outputIdx = columnIndex('output_tokens');

  return values.map((row): ModelUsage => {
    const model: string = row[modelIdx] ?? UNKNOWN_MODEL;
    const promptTier: number = row[tierIdx] ?? 0;
    const cachedTokens: number | null = cachedIdx >= 0 ? row[cachedIdx] : null;
    const usage: TokenUsage = {
      inputTokens: row[inputIdx],
      cachedTokens: cachedTokens ?? 0,
      outputTokens: row[outputIdx] ?? 0,
    };

    return {
      model,
      promptTier,
      ...usage,
      cacheReported: cachedTokens != null,
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
  outputTokens,
  costUsd,
}: ModelUsage) => {
  const label = promptTier > 0 ? `${model} (prompts >${promptTier / 1000}k)` : model;
  const cache = cacheReported ? `${cachedTokens} cached` : 'cache reads not reported';
  const cost = costUsd === null ? 'unpriced' : `$${costUsd.toFixed(4)}`;
  return `${label}: ${inputTokens} input (${cache}), ${outputTokens} output tokens = ${cost}`;
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
      buildQuery: (traceId) => buildCostQuery(traceId, { withCachedTokens: true }),
      // An unmapped cache_read column means re-query without it and price all input as uncached.
      fallbackQuery: {
        matchesQueryError: (error) =>
          error instanceof Error && CACHE_READ_COLUMN_MISSING.test(error.message),
        buildQuery: (traceId) => buildCostQuery(traceId, { withCachedTokens: false }),
      },
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
          metadata: { models: usages },
        };
      },
    },
  });
}
