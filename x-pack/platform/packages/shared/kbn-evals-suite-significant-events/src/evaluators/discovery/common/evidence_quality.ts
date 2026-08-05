/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EvaluationCriterion, Evaluator, Example, TaskOutput } from '@kbn/evals';
import {
  MAX_ASSESSMENT_NOTE_LENGTH,
  MAX_SUMMARY_LENGTH,
  MAX_SYMPTOM_HYPOTHESIS_LENGTH,
  NO_RAW_SENSITIVE_VALUES_RULE,
  SUMMARY_ROLE_RULE,
  SYMPTOM_HYPOTHESIS_ROLE_RULE,
} from '@kbn/significant-events-schema';
import {
  createScenarioCriteriaLlmEvaluator,
  type CreateScenarioCriteriaLlmEvaluatorOptions,
} from '../../scenario_criteria/evaluators';

const EVIDENCE_DESCRIPTION_SHARED_CRITERIA: EvaluationCriterion[] = [
  {
    id: 'evidence_description_informational_exempt',
    text: 'Informational entries are exempt and should be treated as acceptable: quiet-rule signals (evidence is null, trusting the detection-pipeline kind:quiet signal) and "no confirming query available" dispositions do not need a structured verification account. Do not penalize them.',
    score: 1,
  },
  {
    id: 'evidence_description_no_payload',
    text: 'Signal descriptions contain no raw IDs, UUIDs, metric values, PII, PCI, CVV, SSNs, credentials, secrets, or tokens. Concise non-sensitive log signatures are acceptable when they identify decisive evidence; do not penalize literal non-sensitive error text.',
    score: 1,
  },
];

const EVIDENCE_DESCRIPTION_CRITERIA: EvaluationCriterion[] = [
  {
    id: 'evidence_description_is_grounded_check',
    text: 'Every signal the agent verified this cycle (fresh entries — the ones at or near the newest `collected_at` — where it set `confirmed` to true or false) must describe the check in one to three plain sentences covering what was checked, what the data showed, and what that means for the event. The four-part template ("Testing: … Expected if true: … Found: … Verdict: …") is not acceptable for these agent-authored entries. Entries carried forward unchanged from prior cycles (older `collected_at`) are acceptable in any format, including the four-part template. Signals without a confirmed value were not verified and are exempt.',
    score: 1,
  },
  ...EVIDENCE_DESCRIPTION_SHARED_CRITERIA,
];

const NARRATIVE_FIELDS_CRITERIA: EvaluationCriterion[] = [
  {
    id: 'narrative_fields_bounded_and_safe',
    text: `symptom_hypothesis is at most ${MAX_SYMPTOM_HYPOTHESIS_LENGTH} characters, summary is at most ${MAX_SUMMARY_LENGTH} characters, and assessment_note is at most ${MAX_ASSESSMENT_NOTE_LENGTH} characters. ${NO_RAW_SENSITIVE_VALUES_RULE}`,
    score: 1,
  },
  {
    id: 'symptom_hypothesis_mechanism',
    text: `symptom_hypothesis is the evidence-supported technical mechanism for the incident. ${SYMPTOM_HYPOTHESIS_ROLE_RULE}`,
    score: 1,
  },
  {
    id: 'summary_observed_state',
    text: `Summary leads with the normalized observed error signature and affected component or dependency path, then describes the affected operation and scoped impact. ${SUMMARY_ROLE_RULE} It does not narrate queries, detections, analysis steps, p_value, severity_score, or memory-page presence.`,
    score: 1,
  },
  {
    id: 'assessment_note_reasoning_only',
    text: 'assessment_note is concise operator-facing lifecycle detail that explains the assessment decision, ambiguity, or caveat. It does not repeat the observed condition, error signature, impact, signal descriptions, or detection artifacts.',
    score: 1,
  },
];

/** LLM evaluator: grades whether each signal's `description` follows the expected verification account structure. */
export const createEvidenceDescriptionEvaluator = <
  TExample extends Example,
  TOutput extends TaskOutput
>({
  criteriaFn,
  transformOutput,
  criteria = EVIDENCE_DESCRIPTION_CRITERIA,
}: CreateScenarioCriteriaLlmEvaluatorOptions<TExample, TOutput>): Evaluator<TExample, TOutput> =>
  createScenarioCriteriaLlmEvaluator<TExample, TOutput>({
    name: 'evidence_description_quality',
    criteriaFn,
    criteria,
    transformOutput,
  });

/** LLM evaluator: grades the distinctness, safety, and operator usefulness of event narrative fields. */
export const createNarrativeFieldsEvaluator = <
  TExample extends Example,
  TOutput extends TaskOutput
>({
  criteriaFn,
  transformOutput,
}: CreateScenarioCriteriaLlmEvaluatorOptions<TExample, TOutput>): Evaluator<TExample, TOutput> =>
  createScenarioCriteriaLlmEvaluator<TExample, TOutput>({
    name: 'narrative_fields_quality',
    criteriaFn,
    criteria: NARRATIVE_FIELDS_CRITERIA,
    transformOutput,
  });
