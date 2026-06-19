/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EvaluationCriterion, Evaluator } from '@kbn/evals';
import type { InvestigatorEvaluationExample, InvestigatorOutput } from '../types';

/**
 * LLM-judge evaluator: given `output.expected_kind` from the scenario and
 * the actual discoveries, assesses whether the kind decisions were correct.
 */
export const createKindCorrectnessEvaluator = (
  criteriaFn: (criteria: EvaluationCriterion[]) => Evaluator
): Evaluator<InvestigatorEvaluationExample, InvestigatorOutput> => ({
  name: 'kind_correctness',
  kind: 'LLM',
  evaluate: async (params) => {
    const { output, expected } = params;
    const expectedKind = (expected as Record<string, unknown>)?.expected_kind as string | undefined;

    if (!expectedKind || expectedKind === 'any') {
      return {
        score: null,
        label: 'unavailable',
        explanation: 'expected_kind is "any" or not specified — skipping kind correctness check',
      };
    }

    const discoveries = (output as InvestigatorOutput)?.discoveries ?? [];
    const kinds = discoveries.map((d) => (d as Record<string, unknown>).kind).filter(Boolean);

    const criteria: EvaluationCriterion[] = [
      {
        id: 'kind_correctness',
        text: `The discoveries should have kind "${expectedKind}". Actual kinds: [${kinds.join(
          ', '
        )}]. Verify the kind decisions match the expected outcome.`,
        score: 1,
      },
    ];

    return criteriaFn(criteria).evaluate({
      ...params,
      output: output as InvestigatorOutput,
    });
  },
});
