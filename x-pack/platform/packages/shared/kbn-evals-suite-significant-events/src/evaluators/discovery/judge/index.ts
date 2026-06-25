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
import {
  createToolTrajectoryEvaluator,
  createExecuteEsqlGroundingEvaluator,
} from '../common/tool_usage/tool_usage_validation';
import {
  createCriticalityCalibrationEvaluator,
  createConfidenceCalibrationEvaluator,
} from '../calibration';
import { schemaValidityJudgeEvaluator } from './schema/schema_validity';
import { confirmedEvidencesEvaluator } from './evidences/confirmed_evidences';
import { createStatusCorrectnessEvaluator } from './status/status_correctness';

export type { ScenarioCriteriaConfig } from '../types';

/**
 * Factory that creates the full set of evaluators for the judge agent eval suite.
 */
export const createJudgeEvaluators = (
  scenarioCriteria?: ScenarioCriteriaConfig
): Array<Evaluator<JudgeEvaluationExample, JudgeOutput>> => {
  const codeEvaluators: JudgeEvaluator[] = [
    schemaValidityJudgeEvaluator,
    createToolTrajectoryEvaluator() as JudgeEvaluator,
    createExecuteEsqlGroundingEvaluator() as JudgeEvaluator,
    confirmedEvidencesEvaluator,
  ];

  const base = selectEvaluators(codeEvaluators);

  if (!scenarioCriteria) {
    return base;
  }

  const { criteriaFn, criteria } = scenarioCriteria;
  const toCriteria = (c: Parameters<typeof criteriaFn>[0]) =>
    criteriaFn(c) as Evaluator<JudgeEvaluationExample, JudgeOutput>;
  // Drop the bulky `steps` before the calibration judge sees the output.
  const withoutSteps = (output: JudgeOutput): JudgeOutput => ({ ...output, steps: [] });

  return [
    ...base,
    createStatusCorrectnessEvaluator(criteriaFn),
    createScenarioCriteriaLlmEvaluator<JudgeEvaluationExample, JudgeOutput>({
      criteriaFn: toCriteria,
      criteria,
    }),
    createCriticalityCalibrationEvaluator<JudgeEvaluationExample, JudgeOutput>({
      criteriaFn,
      transformOutput: withoutSteps,
    }),
    createConfidenceCalibrationEvaluator<JudgeEvaluationExample, JudgeOutput>({
      criteriaFn,
      transformOutput: withoutSteps,
    }),
  ];
};
