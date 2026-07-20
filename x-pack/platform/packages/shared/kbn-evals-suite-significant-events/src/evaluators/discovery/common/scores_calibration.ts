/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EvaluationCriterion, Evaluator } from '@kbn/evals';
import type { CreateScenarioCriteriaLlmEvaluatorOptions } from '../../scenario_criteria/evaluators';
import { createScenarioCriteriaLlmEvaluator } from '../../scenario_criteria/evaluators';

type CalibrationCriteriaFn = CreateScenarioCriteriaLlmEvaluatorOptions['criteriaFn'];

const createCalibrationEvaluator = (
  name: string,
  criteria: EvaluationCriterion[],
  criteriaFn: CalibrationCriteriaFn
): Evaluator => createScenarioCriteriaLlmEvaluator({ name, criteria, criteriaFn });

const SEVERITY_CALIBRATION_CRITERIA: EvaluationCriterion[] = [
  {
    id: 'severity_reflects_user_impact',
    text: 'Severity reflects user-experience impact — blocked user tasks, blast radius, confirmed sensitive-data exposure — not raw signal or anomaly strength.',
  },
  {
    id: 'critical_severity_requires_confirmed_impact',
    text: '"80-critical" severity is warranted only for confirmed user-task-blocking failures affecting a core user journey or confirmed live sensitive-data exposure with broad blast radius; bounded or partial impact belongs at "60-high" or "40-medium".',
  },
  {
    id: 'weak_signals_low_severity',
    text: 'Unconfirmed signals — no confirmed failure evidence AND not statistically credible (high p_value) — should not claim high criticality. Neither change-point shape nor raw alert volume is a severity signal: a low-volume but evidence-confirmed failure on a user-critical path can warrant high criticality, and a high-volume signal is not severe without confirmed impact. Do not lower criticality merely because a rule fired few times.',
    score: 1,
  },
];

const CONFIDENCE_CALIBRATION_CRITERIA: EvaluationCriterion[] = [
  {
    id: 'confidence_reflects_support',
    text: 'Confidence reflects how well-supported the assessment is — KI backing, number of confirmed evidences, and corroboration — not the raw anomaly strength.',
  },
  {
    id: 'no_ki_caps_confidence',
    text: 'Failure findings with no KI match and no confirmed failure evidence should not claim high confidence (kept at or below ~0.65 without KI backing). Exception: refuted discoveries — where queries returned healthy rows (`evidence.result: "found"` with no error signature) confirming the signal is a non-event — are confirmed non-events, not unconfirmed findings, so they may sit in the 0.65–0.75 range without KI backing and are exempt from this cap.',
  },
  {
    id: 'strong_corroboration_high_confidence',
    text: 'Only strongly corroborated findings (multiple confirmed evidences plus aligned KI backing, with no contradiction) may claim high confidence (>=0.85).',
  },
];

/** LLM evaluator: scores whether `severity` is justified by signal strength and confirmed impact. */
export const createSeverityCalibrationEvaluator = ({
  criteriaFn,
}: {
  criteriaFn: CalibrationCriteriaFn;
}): Evaluator =>
  createCalibrationEvaluator('severity_calibration', SEVERITY_CALIBRATION_CRITERIA, criteriaFn);

/** LLM evaluator: scores whether `confidence` reflects evidence/KI backing, with the no-KI ceiling. */
export const createConfidenceCalibrationEvaluator = ({
  criteriaFn,
}: {
  criteriaFn: CalibrationCriteriaFn;
}): Evaluator =>
  createCalibrationEvaluator('confidence_calibration', CONFIDENCE_CALIBRATION_CRITERIA, criteriaFn);
