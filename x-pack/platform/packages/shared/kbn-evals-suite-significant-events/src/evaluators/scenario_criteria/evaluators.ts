/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EvaluationCriterion, Evaluator, Example, TaskOutput } from '@kbn/evals';

export interface CreateScenarioCriteriaLlmEvaluatorOptions<
  TExample extends Example = Example,
  TTaskOutput extends TaskOutput = TaskOutput
> {
  criteriaFn: (criteria: EvaluationCriterion[]) => Evaluator<TExample, TTaskOutput>;
  criteria?: EvaluationCriterion[];
  transformOutput?: (output: TTaskOutput) => TTaskOutput;
  name?: string;
}

/**
 * Creates an LLM-judged evaluator that checks the output against scenario-specific
 * criteria (e.g.: "queries should target payment errors", "features must include
 * infrastructure context"). Delegates to the provided {@link criteriaFn} which
 * typically binds to `evaluators.criteria()` from `@kbn/evals`.
 *
 * When {@link criteria} is provided, those static criteria are used for every example.
 * When omitted, the evaluator reads criteria dynamically from `expected.criteria`,
 * allowing a single evaluator instance to handle examples with different criteria
 * in a batched `runExperiment` call.
 *
 * @param criteriaFn  Factory that builds a criteria evaluator from a list of criteria.
 * @param criteria    Static evaluation criteria. When omitted, read from `expected.criteria` per example.
 * @param transformOutput  Optional transform applied to the raw output before it is
 *  sent to the criteria evaluator. Use this when the evaluator
 *  output wraps the relevant data (e.g. `{ features: [...] }`).
 */
export const createScenarioCriteriaLlmEvaluator = <
  TExample extends Example = Example,
  TTaskOutput extends TaskOutput = TaskOutput
>({
  name = 'scenario_criteria',
  criteria,
  criteriaFn,
  transformOutput,
}: CreateScenarioCriteriaLlmEvaluatorOptions<TExample, TTaskOutput>): Evaluator<
  TExample,
  TTaskOutput
> => ({
  name,
  kind: 'LLM' as const,
  evaluate: async (params) => {
    const { input, output, expected, metadata } = params;
    const resolvedCriteria =
      criteria ?? (expected as Record<string, unknown> | null)?.criteria ?? [];

    return criteriaFn(resolvedCriteria as EvaluationCriterion[]).evaluate({
      input,
      expected,
      output: transformOutput ? transformOutput(output) : output,
      metadata,
    });
  },
});
