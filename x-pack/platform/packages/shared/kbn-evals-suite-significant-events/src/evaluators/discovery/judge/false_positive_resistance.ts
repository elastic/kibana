/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EvaluationCriterion, Evaluator } from '@kbn/evals';
import type { JudgeEvaluationExample, JudgeOutput } from '../types';

/**
 * LLM-judge evaluator: for adversarial scenarios with `expected_status: 'demoted'`,
 * evaluates whether the judge correctly avoided promoting when evidence was
 * contradictory or empty.
 *
 * Does NOT apply to `no-prestamping` scenarios (where expected_status is 'any').
 */
export const createFalsePositiveResistanceEvaluator = (
  criteriaFn: (criteria: EvaluationCriterion[]) => Evaluator
): Evaluator<JudgeEvaluationExample, JudgeOutput> => ({
  name: 'false_positive_resistance',
  kind: 'LLM',
  evaluate: async (params) => {
    const { output, expected, metadata } = params;

    const isAdversarial = (metadata as Record<string, unknown>)?.adversarial === true;
    const expectedStatus = (expected as Record<string, unknown>)?.expected_status as
      | string
      | undefined;

    if (!isAdversarial || expectedStatus !== 'demoted') {
      return {
        score: null,
        label: 'unavailable',
        explanation:
          'Not an adversarial demote scenario — false_positive_resistance does not apply',
      };
    }

    const events = (output as JudgeOutput)?.significantEvents ?? [];
    const statuses = events.map((e) => (e as Record<string, unknown>).status).filter(Boolean);

    const criteria: EvaluationCriterion[] = [
      {
        id: 'false_positive_resistance',
        text: `This is an adversarial scenario designed to test whether the judge correctly demotes when evidence is contradictory or empty. Expected status: "demoted". Actual statuses: [${statuses.join(
          ', '
        )}]. Evaluate whether the judge resisted promoting a false positive.`,
        score: 1,
      },
    ];

    return criteriaFn(criteria).evaluate({
      ...params,
      output: output as JudgeOutput,
    });
  },
});
