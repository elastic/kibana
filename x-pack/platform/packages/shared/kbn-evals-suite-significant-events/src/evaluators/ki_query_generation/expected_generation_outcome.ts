/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Evaluator } from '@kbn/evals';
import type { KIQueryGenerationEvaluationExample, KIQueryGenerationOutput } from './types';
import { getQueriesFromOutput, getQueryAttempts, getToolUsageFromOutput } from './types';

/**
 * Deterministic outcome contract: verifies whether accepted-query presence
 * matches the example's explicit `expect_queries` expectation. Scores null
 * when the example carries no expectation.
 */
export const expectedGenerationOutcomeEvaluator: Evaluator<
  KIQueryGenerationEvaluationExample,
  KIQueryGenerationOutput
> = {
  name: 'expected_generation_outcome',
  kind: 'CODE',
  direction: 'maximize',
  evaluate: async ({ output, expected }) => {
    const expectQueries = expected?.expect_queries;
    if (expectQueries == null) {
      return {
        score: null,
        label: 'skipped',
        explanation: 'Example output carries no expect_queries contract',
      };
    }

    const queries = getQueriesFromOutput(output);
    if (expectQueries) {
      const passed = queries.length > 0;
      return {
        score: passed ? 1 : 0,
        label: passed ? 'PASS' : 'FAIL',
        explanation: `Expected some accepted queries, observed ${queries.length}`,
      };
    }

    if (queries.length > 0) {
      return {
        score: 0,
        label: 'FAIL',
        explanation: `Expected no accepted queries and no query attempts; observed ${queries.length} accepted`,
      };
    }

    const queryAttempts = getQueryAttempts(output);
    if (queryAttempts === undefined) {
      return {
        score: null,
        label: 'skipped',
        explanation:
          'Expected no accepted queries and no query attempts, but query attempts were not collected',
      };
    }

    const toolUsage = getToolUsageFromOutput(output);
    if (toolUsage === undefined) {
      return {
        score: null,
        label: 'skipped',
        explanation:
          'Expected no accepted queries after successful feature inspection, but tool usage was not collected',
      };
    }

    const passed =
      queryAttempts.length === 0 &&
      toolUsage.get_stream_features.calls > 0 &&
      toolUsage.get_stream_features.failures === 0 &&
      toolUsage.add_queries.calls === 0;
    const attemptOutcomes = [
      ...new Set(
        queryAttempts.map((attempt) => attempt.failureReason ?? attempt.status.toLowerCase())
      ),
    ].sort();

    return {
      score: passed ? 1 : 0,
      label: passed ? 'PASS' : 'FAIL',
      explanation:
        `Expected no accepted queries or add_queries calls after successful feature inspection; ` +
        `observed 0 accepted, ${toolUsage.get_stream_features.calls} get_stream_features calls, ` +
        `${toolUsage.get_stream_features.failures} get_stream_features failures, ` +
        `${toolUsage.add_queries.calls} add_queries calls, ` +
        `${queryAttempts.length} attempts${
          attemptOutcomes.length > 0 ? ` (${attemptOutcomes.join(', ')})` : ''
        }`,
    };
  },
};
