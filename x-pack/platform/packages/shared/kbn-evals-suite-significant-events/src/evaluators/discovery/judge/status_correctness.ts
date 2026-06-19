/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EvaluationCriterion, Evaluator } from '@kbn/evals';
import type { JudgeEvaluationExample, JudgeOutput } from '../types';

/**
 * LLM-judge evaluator: given `output.expected_status` from the scenario,
 * assesses whether the status decision(s) are correct.
 */
export const createStatusCorrectnessEvaluator = (
  criteriaFn: (criteria: EvaluationCriterion[]) => Evaluator
): Evaluator<JudgeEvaluationExample, JudgeOutput> => ({
  name: 'status_correctness',
  kind: 'LLM',
  evaluate: async (params) => {
    const { output, expected } = params;
    const expectedStatus = (expected as Record<string, unknown>)?.expected_status as
      | string
      | undefined;

    if (!expectedStatus || expectedStatus === 'any') {
      return {
        score: null,
        label: 'unavailable',
        explanation:
          'expected_status is "any" or not specified — skipping status correctness check',
      };
    }

    const events = (output as JudgeOutput)?.significantEvents ?? [];
    const statuses = events.map((e) => (e as Record<string, unknown>).status).filter(Boolean);

    const criteria: EvaluationCriterion[] = [
      {
        id: 'status_correctness',
        text: `The significant events should have status "${expectedStatus}". Actual statuses: [${statuses.join(
          ', '
        )}]. Verify the status decisions match the expected outcome.`,
        score: 1,
      },
    ];

    return criteriaFn(criteria).evaluate({
      ...params,
      output: output as JudgeOutput,
    });
  },
});
