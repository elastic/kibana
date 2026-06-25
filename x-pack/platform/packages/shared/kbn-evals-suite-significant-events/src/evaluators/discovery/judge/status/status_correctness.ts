/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EvaluationCriterion, Evaluator } from '@kbn/evals';
import type { JudgeEvaluationExample, JudgeOutput } from '../../types';

/**
 * The Incident Commander status decision gates, mirrored from the judge instructions
 * (status table + Critical Rules 6–7). Inlining them gives the LLM judge the standard to grade
 * against, so it assesses whether the decision is *justified by the evidence* — not just whether
 * the label matches.
 */
const STATUS_DECISION_RUBRIC = [
  "As Incident Commander, each event's `status` must follow these gates:",
  '- `promoted` (kind:discovery only): credible signal (p_value ≤ 0.05) AND ≥1 `confirmed: true` evidence the judge verified this cycle AND criticality ≥ 76 AND a blocked user task or confirmed live sensitive-data (PII/credentials/secrets) exposure.',
  '- `acknowledged`: signal is real and credible but impact is bounded (criticality 31–75), recovery is uncertain, or evidence is credible but below the paging bar. This is the default when the call is borderline.',
  '- `demoted` (kind:discovery only): confirmed false alarm — p_value > 0.1 with no KI corroboration, or the current-state check shows the stream alive with errors cleared (criticality ≤ 30).',
  '- `resolved` (kind:clearance only): recovery independently confirmed, no active-failure evidence.',
  'Hard constraints: never `promoted`/`demoted` from a clearance input; never `resolved` from a discovery input. When genuinely uncertain, the correct call is the more conservative one (`acknowledged` over `promoted`, `acknowledged` over `demoted`).',
].join('\n');

/**
 * LLM-judge evaluator: grades whether the judge's `status` decision matches the scenario's
 * calibrated-correct outcome AND is consistent with the IC decision gates and the event's evidence.
 * Over-escalation (e.g. `promoted` where `acknowledged` was warranted), under-escalation, and
 * constraint violations all fail — not just a mismatched label.
 */
export const createStatusCorrectnessEvaluator = (
  criteriaFn: (criteria: EvaluationCriterion[]) => Evaluator
): Evaluator<JudgeEvaluationExample, JudgeOutput> => ({
  name: 'status_correctness',
  kind: 'LLM',
  evaluate: async (params) => {
    const { output, expected } = params;
    const expectedStatus = expected?.expected_status;

    if (!expectedStatus || expectedStatus === 'any') {
      return {
        score: null,
        label: 'unavailable',
        explanation:
          'expected_status is "any" or not specified — skipping status correctness check',
      };
    }

    const events = (output as JudgeOutput)?.significantEvents ?? [];
    const statuses = events.map((e) => (e as Record<string, unknown>).status).filter(Boolean);

    const criteria: EvaluationCriterion[] = [
      {
        id: 'status_correctness',
        score: 1,
        text:
          `${STATUS_DECISION_RUBRIC}\n\n` +
          `The calibrated-correct status for this scenario is "${expectedStatus}". ` +
          `The judge returned status [${statuses.join(', ') || 'none'}]. ` +
          `PASS only if the returned status matches that outcome AND is justified by the event's ` +
          `evidence, criticality, and the gates above. An over-escalation, under-escalation, or ` +
          `constraint violation is a FAIL even if it is "close".`,
      },
    ];

    return criteriaFn(criteria).evaluate({
      ...params,
      output: output as JudgeOutput,
    });
  },
});
