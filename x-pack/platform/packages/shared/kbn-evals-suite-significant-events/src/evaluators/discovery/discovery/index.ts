/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { selectEvaluators } from '@kbn/evals';
import { createScenarioCriteriaLlmEvaluator } from '../../scenario_criteria/evaluators';
import type { CreateScenarioCriteriaLlmEvaluatorOptions } from '../../scenario_criteria/evaluators';
import type { DiscoveryEvaluator } from '../types';
import { createExecuteEsqlGroundingEvaluator } from '../common/esql_grounding';
import { createDiscoveryToolUsageEvaluator } from './tool_usage/tool_usage';
import {
  createCriticalityCalibrationEvaluator,
  createConfidenceCalibrationEvaluator,
} from '../common/scores_calibration';
import { createEvidenceDescriptionEvaluator } from '../common/evidence_quality';
import { schemaValidityDiscoveryEvaluator } from './schema/schema_validity';
import { groupingCorrectnessEvaluator } from './grouping/grouping_correctness';
import { evidenceCollectionEvaluator } from './evidences/evidence_collection';

/**
 * Factory that creates the full set of evaluators for the discovery agent eval suite.
 */
export const createDiscoveryEvaluators = (
  scenarioCriteria?: CreateScenarioCriteriaLlmEvaluatorOptions
): DiscoveryEvaluator[] => {
  const codeEvaluators: DiscoveryEvaluator[] = [
    schemaValidityDiscoveryEvaluator,
    groupingCorrectnessEvaluator,
    evidenceCollectionEvaluator,
    createDiscoveryToolUsageEvaluator(),
    createExecuteEsqlGroundingEvaluator(),
  ];

  const base = selectEvaluators(codeEvaluators);

  if (!scenarioCriteria) {
    return base;
  }

  const { criteriaFn, criteria } = scenarioCriteria;

  return [
    ...base,
    createScenarioCriteriaLlmEvaluator({ criteriaFn, criteria }),
    createEvidenceDescriptionEvaluator({ criteriaFn }),
    createCriticalityCalibrationEvaluator({ criteriaFn }),
    createConfidenceCalibrationEvaluator({ criteriaFn }),
  ];
};
