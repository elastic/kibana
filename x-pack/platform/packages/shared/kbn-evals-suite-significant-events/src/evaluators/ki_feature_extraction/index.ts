/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { selectEvaluators } from '@kbn/evals';
import type { EvaluationCriterion, Evaluator } from '@kbn/evals';
import { createScenarioCriteriaLlmEvaluator } from '../scenario_criteria/evaluators';
import { createConfidenceCalibrationEvaluator } from './confidence/confidence_calibration';
import { typeValidationEvaluator } from './type/type_validation';
import { typeAssertionsEvaluator } from './type/type_assertions';
import { evidenceCoverageEvaluator } from './evidence/evidence_coverage';
import { evidenceGroundingEvaluator } from './evidence/evidence_grounding';
import { filterCoverageEvaluator } from './filter/filter_coverage';
import { filterGroundingEvaluator } from './filter/filter_grounding';
import { kiFeatureCountEvaluator } from './bounds/ki_feature_count';
import type {
  KIFeatureExtractionEvaluationExample,
  KIFeatureExtractionEvaluator,
  KIFeatureExtractionOutput,
} from './types';
import { getFeaturesFromOutput } from './types';

export type {
  ValidKIFeatureType,
  KIFeatureExtractionEvaluationExample,
  KIFeatureExtractionEvaluationDataset,
  KIFeatureExtractionOutput,
  KIFeatureExtractionEvaluator,
} from './types';

export { VALID_KI_FEATURE_TYPES, getFeaturesFromOutput } from './types';

export const createKIFeatureExtractionEvaluators = (scenarioCriteria?: {
  criteriaFn: (criteria: EvaluationCriterion[]) => Evaluator;
  criteria?: EvaluationCriterion[];
}) => {
  const evaluators: KIFeatureExtractionEvaluator[] = [
    typeValidationEvaluator,
    evidenceCoverageEvaluator,
    evidenceGroundingEvaluator,
    kiFeatureCountEvaluator,
    typeAssertionsEvaluator,
    filterCoverageEvaluator,
    filterGroundingEvaluator,
  ];
  const base = selectEvaluators(evaluators);

  if (!scenarioCriteria) {
    return base;
  }

  const { criteriaFn, criteria } = scenarioCriteria;
  return [
    ...base,
    createScenarioCriteriaLlmEvaluator<
      KIFeatureExtractionEvaluationExample,
      KIFeatureExtractionOutput
    >({
      criteriaFn: (c) =>
        criteriaFn(c) as Evaluator<KIFeatureExtractionEvaluationExample, KIFeatureExtractionOutput>,
      criteria,
      transformOutput: (output) => getFeaturesFromOutput(output),
    }),
    createConfidenceCalibrationEvaluator({ criteriaFn }),
  ];
};
