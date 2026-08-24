/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EvaluationCriterion, Evaluator, Example, TaskOutput } from '@kbn/evals';
import {
  ASSESSMENT_NOTE_ROLE_RULE,
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
    text: 'Every fresh signal must set `verdict` to `confirms`, `refutes`, `off_topic`, `inconclusive`, or `not_checked`. Do not repeat a Verdict label in the description or add process narration and a "Testing: … Expected: …" preamble. For `confirms`, `refutes`, and `off_topic`, the description states the observed row signature and impact. For `inconclusive`, the description states why the query could not establish a conclusion (empty, error, or ambiguous result). For `not_checked`, the description states that no query ran and why. Entries carried forward unchanged from prior cycles (older `collected_at`) are acceptable in any format.',
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
    text: `Summary leads with the normalized observed error signature and affected component or dependency path, preserving decisive technical details such as the error type/code, operation, protocol, endpoint, port, and relevant non-sensitive address. It may use query KI context or resolved feature metadata to clarify that path without asserting it as a proven cause. It then describes the affected operation and scoped impact. ${SUMMARY_ROLE_RULE} It does not include p_value or severity_score.`,
    score: 1,
  },
  {
    id: 'assessment_note_reasoning_only',
    text: `assessment_note is operator-facing lifecycle reasoning and may be detailed when that improves the decision record. ${ASSESSMENT_NOTE_ROLE_RULE} It must add status, severity, confidence, or uncertainty reasoning rather than merely repeat the observed condition, error signature, impact, or signal description.`,
    score: 1,
  },
  {
    id: 'event_local_narrative',
    text: 'Each event narrative refers only to that event’s final signals, causal_features, and blast_radius. Do not copy a symptom_hypothesis, summary, or assessment_note from another discovery component; names, mechanisms, and impacts must match the event’s own evidence.',
    score: 1,
  },
  {
    id: 'off_topic_error_narrative_focus',
    text: 'When a concrete off-topic error creates its own event, symptom_hypothesis and summary focus on the observed error, affected operation, and bounded impact. Do not repeat the authored rule that the row refuted; keep that rule-to-row mismatch in the signal description or assessment_note.',
    score: 1,
  },
];

const SIGNAL_EVIDENCE_CONSISTENCY_CRITERIA: EvaluationCriterion[] = [
  {
    id: 'signal_confirmation_matches_evidence',
    text: 'Use `confirms` only when a found row directly supports the rule’s failure, degradation, exposure, or evidenced cascade. Use `refutes` for verified healthy, positive, or no-failure evidence; `off_topic` for unrelated found rows; `inconclusive` when a query cannot establish a conclusion; and `not_checked` when no query ran.',
    score: 1,
  },
  {
    id: 'event_decision_matches_signal_evidence',
    text: 'If no signal confirms a failure, degradation, or exposure, dismiss the event unless independent current evidence leaves one plausibly unresolved. In that case, keep it open with an explicit evidence gap. A concrete non-benign error in an off-topic found row directly confirms a separate observed-error event: keep the original rule signal `verdict: off_topic` (not `refutes`), but create or merge an `open` event grounded only in that row’s error signature and impact. The exception does not apply to healthy, ambiguous, or merely unrelated rows; evaluate the observed-error event’s severity and confidence from its direct evidence rather than the source rule’s `verdict`. Exception: close an established same-rule episode when a successful exact query has verified healthy/opposite rows or no matching failure rows, even if the detection direction is ambiguous and the prior signal was not `confirms`. Do not create a new dismissed event for that recovery reconciliation. Same-rule empty/healthy authored-query evidence recovers only episodes grounded in that rule’s hypothesis; for an off-topic observed-error episode, keep it open until evidence of that error class clears (or an operator dismisses it). A query error, telemetry gap, or unrelated result blocks closure. Do not infer a root cause, impact, or severity tier from empty evidence alone.',
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

/** LLM evaluator: grades whether signal confirmation and event decisions match grounded evidence. */
export const createSignalEvidenceConsistencyEvaluator = <
  TExample extends Example,
  TOutput extends TaskOutput
>({
  criteriaFn,
  transformOutput,
}: CreateScenarioCriteriaLlmEvaluatorOptions<TExample, TOutput>): Evaluator<TExample, TOutput> =>
  createScenarioCriteriaLlmEvaluator<TExample, TOutput>({
    name: 'signal_evidence_consistency',
    criteriaFn,
    criteria: SIGNAL_EVIDENCE_CONSISTENCY_CRITERIA,
    transformOutput,
  });
