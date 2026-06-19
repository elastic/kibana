/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Evaluator } from '@kbn/evals';
import { selectEvaluators } from '@kbn/evals';
import { createScenarioCriteriaLlmEvaluator } from '../../scenario_criteria/evaluators';
import type {
  JudgeEvaluationExample,
  JudgeEvaluator,
  JudgeOutput,
  ScenarioCriteriaConfig,
} from '../types';
import { schemaValidityJudgeEvaluator } from './schema_validity';
import { executeEsqlCoverageEvaluator } from './execute_esql_coverage';
import { confirmedConsistencyEvaluator } from './confirmed_consistency';
import { assessmentNotePresenceEvaluator } from './assessment_note_presence';
import { createStatusCorrectnessEvaluator } from './status_correctness';
import { createFalsePositiveResistanceEvaluator } from './false_positive_resistance';

export type { ScenarioCriteriaConfig } from '../types';

/**
 * Factory that creates the full set of evaluators for the judge agent eval suite.
 */
export const createJudgeEvaluators = (
  scenarioCriteria?: ScenarioCriteriaConfig
): Array<Evaluator<JudgeEvaluationExample, JudgeOutput>> => {
  const codeEvaluators: JudgeEvaluator[] = [
    schemaValidityJudgeEvaluator,
    executeEsqlCoverageEvaluator,
    confirmedConsistencyEvaluator,
    assessmentNotePresenceEvaluator,
  ];

  const base = selectEvaluators(codeEvaluators);

  if (!scenarioCriteria) {
    return base;
  }

  const { criteriaFn, criteria } = scenarioCriteria;

  return [
    ...base,
    createStatusCorrectnessEvaluator(criteriaFn),
    createFalsePositiveResistanceEvaluator(criteriaFn),
    createScenarioCriteriaLlmEvaluator<JudgeEvaluationExample, JudgeOutput>({
      criteriaFn: (c) => criteriaFn(c) as Evaluator<JudgeEvaluationExample, JudgeOutput>,
      criteria,
    }),
  ];
};
