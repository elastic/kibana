/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { selectEvaluators } from '@kbn/evals';
import { createScenarioCriteriaLlmEvaluator } from '../../scenario_criteria/evaluators';
import type { CreateScenarioCriteriaLlmEvaluatorOptions } from '../../scenario_criteria/evaluators';
import type { DiscoveryJudgeEvaluator } from '../types';
import { createExecuteEsqlGroundingEvaluator } from '../common/esql_grounding';
import { createToolUsageEvaluator } from './tool_usage/tool_usage';
import {
  createCriticalityCalibrationEvaluator,
  createConfidenceCalibrationEvaluator,
} from '../common/scores_calibration';
import { createEvidenceDescriptionEvaluator } from '../common/evidence_quality';
import { confirmedEvidencesEvaluator } from './evidences/confirmed_evidences';
import { createStatusCorrectnessEvaluator } from './status/status_correctness';

/**
 * Factory that creates the full set of evaluators for the judge agent eval spec.
 */
export const createJudgeEvaluators = (
  scenarioCriteria?: CreateScenarioCriteriaLlmEvaluatorOptions
): DiscoveryJudgeEvaluator[] => {
  const codeEvaluators: DiscoveryJudgeEvaluator[] = [
    createToolUsageEvaluator(),
    createExecuteEsqlGroundingEvaluator(),
    confirmedEvidencesEvaluator,
  ];

  const base = selectEvaluators(codeEvaluators);

  if (!scenarioCriteria) {
    return base;
  }

  const { criteriaFn, criteria } = scenarioCriteria;

  return [
    ...base,
    createStatusCorrectnessEvaluator(criteriaFn),
    createScenarioCriteriaLlmEvaluator({ criteriaFn, criteria }),
    createEvidenceDescriptionEvaluator({ criteriaFn }),
    createCriticalityCalibrationEvaluator({ criteriaFn }),
    createConfidenceCalibrationEvaluator({ criteriaFn }),
  ];
};
