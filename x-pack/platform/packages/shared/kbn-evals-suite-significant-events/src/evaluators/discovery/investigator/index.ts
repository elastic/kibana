/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Evaluator } from '@kbn/evals';
import { selectEvaluators } from '@kbn/evals';
import type { ElasticsearchClient } from '@kbn/core/server';
import { createScenarioCriteriaLlmEvaluator } from '../../scenario_criteria/evaluators';
import type {
  InvestigatorEvaluationExample,
  InvestigatorEvaluator,
  InvestigatorOutput,
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
import { schemaValidityInvestigatorEvaluator } from './schema/schema_validity';
import { groupingCorrectnessEvaluator } from './grouping/grouping_correctness';
import { evidenceCollectionEvaluator } from './evidences/evidence_collection';

export type { ScenarioCriteriaConfig } from '../types';

/**
 * Factory that creates the full set of evaluators for the investigator agent eval suite.
 */
export const createInvestigatorEvaluators = (
  esClient: ElasticsearchClient,
  scenarioCriteria?: ScenarioCriteriaConfig
): Array<Evaluator<InvestigatorEvaluationExample, InvestigatorOutput>> => {
  const codeEvaluators: InvestigatorEvaluator[] = [
    schemaValidityInvestigatorEvaluator,
    groupingCorrectnessEvaluator,
    evidenceCollectionEvaluator,
    createToolTrajectoryEvaluator() as InvestigatorEvaluator,
    createExecuteEsqlGroundingEvaluator() as InvestigatorEvaluator,
  ];

  const base = selectEvaluators(codeEvaluators);

  if (!scenarioCriteria) {
    return base;
  }

  const { criteriaFn, criteria } = scenarioCriteria;
  const toCriteria = (c: Parameters<typeof criteriaFn>[0]) =>
    criteriaFn(c) as Evaluator<InvestigatorEvaluationExample, InvestigatorOutput>;
  // Drop the bulky `steps` before the calibration judge sees the output.
  const withoutSteps = (output: InvestigatorOutput): InvestigatorOutput => ({
    ...output,
    steps: [],
  });

  return [
    ...base,
    createScenarioCriteriaLlmEvaluator<InvestigatorEvaluationExample, InvestigatorOutput>({
      criteriaFn: toCriteria,
      criteria,
    }),
    createCriticalityCalibrationEvaluator<InvestigatorEvaluationExample, InvestigatorOutput>({
      criteriaFn,
      transformOutput: withoutSteps,
    }),
    createConfidenceCalibrationEvaluator<InvestigatorEvaluationExample, InvestigatorOutput>({
      criteriaFn,
      transformOutput: withoutSteps,
    }),
  ];
};
