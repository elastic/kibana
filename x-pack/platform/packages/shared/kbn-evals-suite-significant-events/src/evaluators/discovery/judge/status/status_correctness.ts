/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EvaluationCriterion, Evaluator } from '@kbn/evals';
import type { DiscoveryJudgeEvaluationExample, DiscoveryJudgeAgentOutput } from '../../types';

/** Status decision gates, mirrored from the judge instructions so the LLM grades evidence justification. */
const STATUS_DECISION_RUBRIC = [
  "As Incident Commander, each event's `status` and `severity` must follow these gates:",
  '- `status: "open"` with `severity: "critical"` (kind:discovery only): credible signal (p_value ≤ 0.05) AND ≥1 `confirmed: true` signal the judge verified this cycle AND a blocked user task or confirmed live sensitive-data (PII/credentials/secrets) exposure AND blast radius spans ≥2 exposed downstream services or a core user journey.',
  '- `status: "open"` with `severity: "high"`: signal is real and credible (p_value ≤ 0.05) with confirmed user impact but bounded blast radius. This is the default when the call is borderline between critical and lower.',
  '- `status: "open"` with `severity: "medium"`: signal credible but impact not confirmed, or evidence is ambiguous.',
  '- `status: "open"` with `severity: "low"` (kind:discovery only): confirmed false alarm or recovered, but still corroborated (confidence ≥ 0.5, e.g. ≥1 confirmed:true signal) — p_value > 0.1 with no KI corroboration, or the current-state check shows the stream alive with errors cleared. Stays open — closing is a user decision, not the judge\'s.',
  '- `status: "dismissed"` (kind:discovery only): same low-severity finding as above, but confidence is ALSO low (< 0.5) — too few corroborating signals to trust the finding at all.',
  '- `status: "closed"` (kind:clearance only): recovery independently confirmed, no active-failure evidence.',
  'Hard constraints: never `closed` from a discovery input. When genuinely uncertain, the correct call is the more conservative one (`open/medium` over `open/critical`, `open/medium` over `open/low`, `open/low` over `dismissed`).',
].join('\n');

/**
 * LLM evaluator: grades whether `status`/`severity` matches the calibrated outcome and the IC decision gates.
 * Over/under-escalation and constraint violations fail. Score per scenario criteria.
 */
export const createStatusCorrectnessEvaluator = (
  criteriaFn: (criteria: EvaluationCriterion[]) => Evaluator
): Evaluator<DiscoveryJudgeEvaluationExample, DiscoveryJudgeAgentOutput> => ({
  name: 'status_correctness',
  kind: 'LLM',
  evaluate: async (params) => {
    const { output, expected } = params;
    const expectedGroundTruth = expected?.expected_ground_truth;

    if (!expectedGroundTruth) {
      return {
        score: null,
        label: 'unavailable',
        explanation: 'expected_ground_truth not specified — skipping status correctness check',
      };
    }

    const events = output?.significantEvents ?? [];
    const eventsSummary = events.map((e) => ({
      event_id: e.event_id,
      status: e.status,
      severity: e.severity,
      confidence: e.confidence,
      confirmedSignalCount: (e.signals ?? []).filter((s) => s.confirmed === true).length,
    }));

    const criteria: EvaluationCriterion[] = [
      {
        id: 'status_correctness',
        score: 1,
        text:
          `${STATUS_DECISION_RUBRIC}\n\n` +
          `Expected outcome: ${expectedGroundTruth}. ` +
          `The discovery judge agent returned: ${JSON.stringify(eventsSummary)}. ` +
          `PASS only if each discovery's returned status+severity matches the expected outcome (match by title/content, not by exact event_id) AND is justified by the event's ` +
          `signals, severity, and the gates above. An over-escalation, under-escalation, or ` +
          `constraint violation is a FAIL even if it is "close".`,
      },
    ];

    return criteriaFn(criteria).evaluate({
      ...params,
      output,
    });
  },
});
