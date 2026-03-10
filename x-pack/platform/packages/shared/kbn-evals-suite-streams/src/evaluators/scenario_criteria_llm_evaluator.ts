/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EvaluationCriterion, Evaluator } from '@kbn/evals';

export interface CreateScenarioCriteriaLlmEvaluatorOptions {
  criteriaFn: (criteria: EvaluationCriterion[]) => Evaluator;
  criteria: EvaluationCriterion[];
  transformOutput?: (output: unknown) => unknown;
  name?: string;
}

/**
 * Creates an LLM-judged evaluator that checks the output against scenario-specific
 * criteria (e.g.: "queries should target payment errors", "features must include
 * infrastructure context"). Delegates to the provided {@link criteriaFn} which
 * typically binds to `evaluators.criteria()` from `@kbn/evals`.
 *
 * @param criteriaFn  Factory that builds a criteria evaluator from a list of criteria.
 * @param criteria    The scenario-specific evaluation criteria to judge against.
 * @param transformOutput  Optional transform applied to the raw output before it is
 *  sent to the criteria evaluator. Use this when the evaluator
 *  output wraps the relevant data (e.g. `{ features: [...] }`).
 */
export const createScenarioCriteriaLlmEvaluator = ({
  name = 'scenario_criteria',
  criteria = [],
  criteriaFn,
  transformOutput,
}: CreateScenarioCriteriaLlmEvaluatorOptions): Evaluator => ({
  name,
  kind: 'LLM' as const,
  evaluate: async (params) => {
    const { input, output, expected, metadata } = params;

    return criteriaFn(criteria).evaluate({
      input,
      expected,
      output: transformOutput ? transformOutput(output) : output,
      metadata,
    });
  },
});
