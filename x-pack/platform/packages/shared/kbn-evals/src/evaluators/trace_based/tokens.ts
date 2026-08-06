/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client as EsClient } from '@elastic/elasticsearch';
import type { ToolingLog } from '@kbn/tooling-log';
import type { Evaluator } from '../../types';
import { createTraceBasedEvaluator } from './factory';

export function createOutputTokensEvaluator({
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
      name: 'Output Tokens',
      // TO_LONG resolves union types (integer vs long across trace index generations).
      buildQuery: (traceId) => `FROM traces-*
        | WHERE trace.id == "${traceId}"
        | STATS 
        output_tokens = SUM(TO_LONG(attributes.gen_ai.usage.output_tokens))`,
      extractResult: (response) => {
        const { columns, values } = response;
        const row = values[0];
        const outputTokensIdx = columns.findIndex((col) => col.name === 'output_tokens');
        return row[outputTokensIdx];
      },
      isResultValid: (result) => result !== null && result > 0,
    },
  });
}

export function createInputTokensEvaluator({
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
      name: 'Input Tokens',
      // TO_LONG resolves union types (integer vs long across trace index generations).
      buildQuery: (traceId) => `FROM traces-*
        | WHERE trace.id == "${traceId}"
        | STATS 
        input_tokens = SUM(TO_LONG(attributes.gen_ai.usage.input_tokens))`,
      extractResult: (response) => {
        const { columns, values } = response;
        const row = values[0];
        const inputTokensIdx = columns.findIndex((col) => col.name === 'input_tokens');
        return row[inputTokensIdx];
      },
      isResultValid: (result) => result !== null && result > 0,
    },
  });
}

export function createCachedTokensEvaluator({
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
      name: 'Cached Tokens',
      // `input_tokens` is only used as a liveness probe for the trace: providers that never report
      // prompt caching (most `.inference`/EIS models) omit the cache_read attribute entirely, so
      // SUM returns null forever. Without the probe, that is indistinguishable from a trace that
      // has not finished indexing and every example burns the full retry budget.
      buildQuery: (traceId) => `FROM traces-*
        | WHERE trace.id == "${traceId}"
        | STATS 
        cached_tokens = SUM(TO_LONG(attributes.gen_ai.usage.cache_read.input_tokens)),
        input_tokens = SUM(TO_LONG(attributes.gen_ai.usage.input_tokens))`,
      extractResult: (response) => {
        const { columns, values } = response;
        const row = values[0];
        const cachedTokensIdx = columns.findIndex((col) => col.name === 'cached_tokens');
        const inputTokensIdx = columns.findIndex((col) => col.name === 'input_tokens');
        const cachedTokens = row[cachedTokensIdx];

        if (cachedTokens !== null && cachedTokens !== undefined) {
          return cachedTokens;
        }

        const inputTokens = row[inputTokensIdx];
        return inputTokens === null || inputTokens === undefined ? null : 0;
      },
      isResultValid: (result) => result !== null,
    },
  });
}
