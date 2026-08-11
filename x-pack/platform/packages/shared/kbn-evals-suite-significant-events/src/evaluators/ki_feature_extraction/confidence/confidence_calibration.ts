/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EvaluationCriterion, Evaluator } from '@kbn/evals';
import { createScenarioCriteriaLlmEvaluator } from '../../scenario_criteria/evaluators';
import type { KIFeatureExtractionEvaluationExample, KIFeatureExtractionOutput } from '../types';
import { getFeaturesFromOutput } from '../types';

const CONFIDENCE_CALIBRATION_CRITERIA: EvaluationCriterion[] = [
  {
    id: 'direct_evidence_high_confidence',
    text: 'Features backed by explicit, unambiguous identifiers (service name labels, namespace, container image tags) should claim high confidence values.',
    score: 1,
  },
  {
    id: 'indirect_evidence_lower_confidence',
    text: 'Features inferred indirectly (dependencies from log messages, schemas from field structure, technologies from stack traces) should have lower confidence than directly-evidenced features.',
    score: 1,
  },
  {
    id: 'no_false_certainty',
    text: 'Features with weak or indirect evidence should not claim confidence=100.',
    score: 1,
  },
];

/**
 * LLM-judged evaluator that checks whether confidence values are calibrated
 * relative to the directness and strength of the evidence provided.
 * Runs independently from scenario_criteria so both signals can be tracked
 * and tuned separately.
 */
export const createConfidenceCalibrationEvaluator = ({
  criteriaFn,
}: {
  criteriaFn: (criteria: EvaluationCriterion[]) => Evaluator;
}): Evaluator<KIFeatureExtractionEvaluationExample, KIFeatureExtractionOutput> =>
  createScenarioCriteriaLlmEvaluator<
    KIFeatureExtractionEvaluationExample,
    KIFeatureExtractionOutput
  >({
    name: 'confidence_calibration',
    criteriaFn: (c) =>
      criteriaFn(c) as Evaluator<KIFeatureExtractionEvaluationExample, KIFeatureExtractionOutput>,
    criteria: CONFIDENCE_CALIBRATION_CRITERIA,
    transformOutput: (output) => getFeaturesFromOutput(output),
  });
