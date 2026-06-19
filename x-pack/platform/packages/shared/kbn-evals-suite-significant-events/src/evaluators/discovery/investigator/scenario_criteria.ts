/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EvaluationCriterion, Evaluator } from '@kbn/evals';
import { createScenarioCriteriaLlmEvaluator } from '../../scenario_criteria/evaluators';
import type { InvestigatorEvaluationExample, InvestigatorOutput } from '../types';

/**
 * Reuses the generic scenario criteria LLM evaluator for the investigator.
 */
export const createInvestigatorScenarioCriteriaEvaluator = (
  criteriaFn: (criteria: EvaluationCriterion[]) => Evaluator
): Evaluator<InvestigatorEvaluationExample, InvestigatorOutput> =>
  createScenarioCriteriaLlmEvaluator<InvestigatorEvaluationExample, InvestigatorOutput>({
    criteriaFn: (c) =>
      criteriaFn(c) as Evaluator<InvestigatorEvaluationExample, InvestigatorOutput>,
  });
