/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Evaluator } from '@kbn/evals';
import type { KIQueryGenerationEvaluationExample, KIQueryGenerationOutput } from './types';
import { getQueriesFromOutput } from './types';

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
    const passed = expectQueries ? queries.length > 0 : queries.length === 0;
    return {
      score: passed ? 1 : 0,
      label: passed ? 'PASS' : 'FAIL',
      explanation: `Expected ${expectQueries ? 'some accepted' : 'no accepted'} queries, observed ${
        queries.length
      }`,
    };
  },
};
