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

const EVIDENCE_DESCRIPTION_CRITERIA: EvaluationCriterion[] = [
  {
    id: 'evidence_description_is_hypothesis_test',
    text: 'Every signal where the judge set `confirmed` to true or false must document its verification using the four-part structure: "Testing: … Expected if true: … Found: … Verdict: …". Signals without a confirmed value were not verified and are exempt.',
    score: 1,
  },
  {
    id: 'evidence_description_informational_exempt',
    text: 'Informational entries are exempt and should be treated as acceptable: quiet-rule signals (evidence is null, trusting the detection-pipeline kind:quiet signal) and "no confirming query available" dispositions do not need the four-part structure. Do not penalize them.',
    score: 1,
  },
  {
    id: 'evidence_description_no_payload',
    text: 'Signal descriptions contain no raw IDs, UUIDs, metric values, PII, PCI, CVV, SSNs, credentials, secrets, or tokens. Concise non-sensitive log signatures are acceptable when they identify decisive evidence; do not penalize literal non-sensitive error text.',
    score: 1,
  },
];

/** LLM evaluator: grades whether each signal's `description` follows the 4-part hypothesis-test structure. */
export const createEvidenceDescriptionEvaluator = <
  TExample extends Example,
  TOutput extends TaskOutput
>({
  criteriaFn,
  transformOutput,
}: CreateScenarioCriteriaLlmEvaluatorOptions<TExample, TOutput>): Evaluator<TExample, TOutput> =>
  createScenarioCriteriaLlmEvaluator<TExample, TOutput>({
    name: 'evidence_description_quality',
    criteriaFn,
    criteria: EVIDENCE_DESCRIPTION_CRITERIA,
    transformOutput,
  });
