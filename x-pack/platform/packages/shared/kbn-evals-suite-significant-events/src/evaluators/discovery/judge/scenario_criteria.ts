/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EvaluationCriterion, Evaluator } from '@kbn/evals';
import { createScenarioCriteriaLlmEvaluator } from '../../scenario_criteria/evaluators';
import type { JudgeEvaluationExample, JudgeOutput } from '../types';

/**
 * Reuses the generic scenario criteria LLM evaluator for the judge.
 */
export const createJudgeScenarioCriteriaEvaluator = (
  criteriaFn: (criteria: EvaluationCriterion[]) => Evaluator
): Evaluator<JudgeEvaluationExample, JudgeOutput> =>
  createScenarioCriteriaLlmEvaluator<JudgeEvaluationExample, JudgeOutput>({
    criteriaFn: (c) => criteriaFn(c) as Evaluator<JudgeEvaluationExample, JudgeOutput>,
  });
