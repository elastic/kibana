/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EvaluationCriterion, Evaluator, Example, TaskOutput } from '@kbn/evals';
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
    id: 'evidence_description_is_hypothesis_test',
    text: 'Every signal where the agent set `confirmed` to true or false must use the compact verification format: "Testing: [hypothesis]. Found: [signature/target from row]. Why: [causal link — failing upstream and mechanism when confirms or inconclusive]. Verdict: confirms | refutes | inconclusive — [impact]." Omit Why only for refutes with no failure signature. "no match. Verdict: refutes." is acceptable when the query returned zero rows. Signals without a confirmed value were not verified and are exempt.',
    score: 1,
  },
  ...EVIDENCE_DESCRIPTION_SHARED_CRITERIA,
];

/**
 * Judge-authored descriptions follow the compact re-ran/Found/Why/Verdict contract from the judge
 * instructions (`<communication>`); carried entries keep whatever format they arrived with,
 * including the discovery-agent Testing/Found/Why/Verdict template.
 */
export const JUDGE_EVIDENCE_DESCRIPTION_CRITERIA: EvaluationCriterion[] = [
  {
    id: 'evidence_description_is_grounded_check',
    text: 'Every signal the judge verified this cycle (fresh entries — the ones at or near the newest `collected_at` — where it set `confirmed` to true or false) must use: "re-ran at <HH:MMZ> — Found: [signature, target, or endpoint]. Why: [current-state implication]. Verdict: confirms | refutes | inconclusive — [clause]." The discovery-agent Testing/Found/Why/Verdict template is not acceptable for these judge-authored entries. Entries carried forward unchanged from the input (older `collected_at`) are acceptable in any format, including that template. Signals without a confirmed value were not verified and are exempt.',
    score: 1,
  },
  ...EVIDENCE_DESCRIPTION_SHARED_CRITERIA,
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
