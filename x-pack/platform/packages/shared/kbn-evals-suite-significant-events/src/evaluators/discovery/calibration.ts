/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EvaluationCriterion, Evaluator, Example, TaskOutput } from '@kbn/evals';
import { createScenarioCriteriaLlmEvaluator } from '../scenario_criteria/evaluators';

/**
 * Calibration rubrics shared by the investigator and judge (both emit `criticality` + `confidence`).
 * Static, qualitative criteria — same pattern as the ki_feature_extraction `confidence_calibration`
 * evaluator — so each runs as its own tracked signal rather than being folded into scenario_criteria.
 * Grounded in the agents' `criticality`/`confidence` instructions.
 */

const CRITICALITY_CALIBRATION_CRITERIA: EvaluationCriterion[] = [
  {
    id: 'criticality_reflects_user_impact',
    text: 'Criticality reflects user-experience impact — blocked user tasks, blast radius, confirmed sensitive-data exposure — not raw signal or anomaly strength.',
    score: 1,
  },
  {
    id: 'high_criticality_requires_confirmed_impact',
    text: 'High criticality (>=76) is warranted only for confirmed user-task-blocking failures or confirmed live sensitive-data exposure; bounded or partial impact belongs in the mid range (31-75).',
    score: 1,
  },
  {
    id: 'weak_signals_low_criticality',
    text: 'Weak or unconfirmed signals (no confirmed evidence rows, stationary change type, negligible alert volume) should not claim high criticality.',
    score: 1,
  },
];

const CONFIDENCE_CALIBRATION_CRITERIA: EvaluationCriterion[] = [
  {
    id: 'confidence_reflects_support',
    text: 'Confidence reflects how well-supported the assessment is — KI backing, number of confirmed evidences, and corroboration — not the raw anomaly strength.',
    score: 1,
  },
  {
    id: 'no_ki_caps_confidence',
    text: 'Findings with no KI match or no confirmed evidence should not claim high confidence (kept at or below ~65 without KI backing).',
    score: 1,
  },
  {
    id: 'strong_corroboration_high_confidence',
    text: 'Only strongly corroborated findings (multiple confirmed evidences plus aligned KI backing, with no contradiction) may claim high confidence (>=85).',
    score: 1,
  },
];

interface CalibrationEvaluatorOptions<TExample extends Example, TOutput extends TaskOutput> {
  criteriaFn: (criteria: EvaluationCriterion[]) => Evaluator;
  /** Strip bulky fields (e.g. `steps`) before sending the output to the LLM judge. */
  transformOutput?: (output: TOutput) => TOutput;
}

export const createCriticalityCalibrationEvaluator = <
  TExample extends Example,
  TOutput extends TaskOutput
>({
  criteriaFn,
  transformOutput,
}: CalibrationEvaluatorOptions<TExample, TOutput>): Evaluator<TExample, TOutput> =>
  createScenarioCriteriaLlmEvaluator<TExample, TOutput>({
    name: 'criticality_calibration',
    criteriaFn: (c) => criteriaFn(c) as Evaluator<TExample, TOutput>,
    criteria: CRITICALITY_CALIBRATION_CRITERIA,
    transformOutput,
  });

export const createConfidenceCalibrationEvaluator = <
  TExample extends Example,
  TOutput extends TaskOutput
>({
  criteriaFn,
  transformOutput,
}: CalibrationEvaluatorOptions<TExample, TOutput>): Evaluator<TExample, TOutput> =>
  createScenarioCriteriaLlmEvaluator<TExample, TOutput>({
    name: 'confidence_calibration',
    criteriaFn: (c) => criteriaFn(c) as Evaluator<TExample, TOutput>,
    criteria: CONFIDENCE_CALIBRATION_CRITERIA,
    transformOutput,
  });
