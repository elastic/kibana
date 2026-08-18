/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EvaluationCriterion, Evaluator, Example, TaskOutput } from '@kbn/evals';

export interface CreateScenarioCriteriaLlmEvaluatorOptions<
  TExample extends Example = Example,
  TTaskOutput extends TaskOutput = TaskOutput,
  TJudgedOutput extends TaskOutput = TTaskOutput
> {
  criteriaFn: (criteria: EvaluationCriterion[]) => Evaluator<TExample, TJudgedOutput>;
  criteria?: EvaluationCriterion[];
  /**
   * Optional transform applied to the raw task output before it is sent to the judge.
   * `TJudgedOutput` may differ from `TTaskOutput` (e.g. a composite payload that splits
   * generated queries by type). `context.input` carries the example input so payloads can
   * include input-seeded data (e.g. `existing_queries` on rerun arms).
   */
  transformOutput?: (output: TTaskOutput, context: { input: TExample['input'] }) => TJudgedOutput;
  name?: string;
  /**
   * Optional guard for outputs there is nothing to judge in. Return a reason to abstain
   * (`score: null`) instead of asking the judge to score an empty output, which produces a
   * low score that reads as poor quality rather than as a missing result.
   */
  skipWhen?: (output: TTaskOutput) => string | undefined;
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
  TTaskOutput extends TaskOutput = TaskOutput,
  TJudgedOutput extends TaskOutput = TTaskOutput
>({
  name = 'scenario_criteria',
  criteria,
  criteriaFn,
  transformOutput,
  skipWhen,
}: CreateScenarioCriteriaLlmEvaluatorOptions<TExample, TTaskOutput, TJudgedOutput>): Evaluator<
  TExample,
  TTaskOutput
> => ({
  name,
  kind: 'LLM' as const,
  evaluate: async (params) => {
    const { input, output, expected, metadata } = params;

    const skipReason = skipWhen?.(output);
    if (skipReason) {
      return { score: null, label: 'unavailable', explanation: skipReason };
    }

    const resolvedCriteria =
      criteria ?? (expected as Record<string, unknown> | null)?.criteria ?? [];

    if (!Array.isArray(resolvedCriteria) || resolvedCriteria.length === 0) {
      return {
        score: null,
        label: 'unavailable',
        explanation: 'No scenario criteria specified — skipping scenario criteria check',
      };
    }

    return criteriaFn(resolvedCriteria as EvaluationCriterion[]).evaluate({
      input,
      expected,
      output: transformOutput
        ? transformOutput(output, { input })
        : // Identity cast: TJudgedOutput defaults to TTaskOutput, so this only differs when a
          // caller sets them apart AND omits transformOutput, which no caller does.
          (output as unknown as TJudgedOutput),
      metadata,
    });
  },
});
