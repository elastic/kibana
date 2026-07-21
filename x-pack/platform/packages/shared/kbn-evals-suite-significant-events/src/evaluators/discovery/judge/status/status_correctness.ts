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
  "Grade whether the agent's `status` and `severity` for each event are correct given the gates below.",
  'You are grading the agent output — you cannot run queries. Use the `confirmedSignalCount` field (number of `confirmed: true` signals in the agent output) as a proxy for whether the agent gathered sufficient evidence.',
  '',
  'Active episode (escalation signals):',
  '- `status: "open"` with `severity: "80-critical"`: evidence supports the critical tier, the signal is credible (reflected in ≥1 `confirmed: true` signal in the output). When evidence does not clearly establish that tier\'s scope, `"60-high"` is the correct call — the agent must never downgrade by crediting an unconfirmed workaround or mitigation.',
  '- `status: "open"` with `severity: "60-high"`: the signal is real and credible (reflected in confirmed evidence in the output) and evidence supports the high tier.',
  '- `status: "open"` with `severity: "40-medium"`: the signal is credible and evidence supports the medium tier. `"40-medium"` must not be picked merely to hedge on ambiguous signal quality — that belongs in `confidence` instead.',
  '- `status: "open"` with `severity: "20-low"`: confirmed false alarm or recovered, but still corroborated enough to surface (confidence ≥ 0.5, ≥1 `confirmed: true` signal). Stays `open` unless the doubly-confirmed recovery exception below applies.',
  '- `status: "dismissed"`: same low-severity finding as above but confidence is also low (< 0.5) — too few corroborating signals to trust the finding at all (e.g. confirmedSignalCount == 0, a single weak signal, or no KI corroboration). Too thin to surface.',
  '- `status: "closed"` — doubly-confirmed recovery exception: an active episode may close without a settled-shape signal only when the agent\'s output shows it performed two independent negative/healthy checks (a fresh re-verification returned 0/stale rows AND a follow-up `COUNT(*)` confirmed a live, non-gapped stream). Anything less is not doubly confirmed and must stay `open`.',
  '- All other active-episode outcomes: must not be `closed`.',
  '',
  'Settled episode (downward/settle detection signals):',
  '- `status: "closed"`: the episode is fully settled — every signal\'s `metadata.change_point_type` is a settled/downward value (`stationary` after a prior escalation, or a settle-direction change point; a `dip` is escalation, never recovery). Fresh settled signals require the agent to have re-verified recovery (no active failure rows); carried signals are trusted on their `change_point_type` without re-verification.',
  '',
  'Hard constraints: `closed` for an active episode is only valid under the doubly-confirmed recovery exception above. When genuinely uncertain, the correct call is the more conservative one (`open/40-medium` over `open/80-critical`, `open/40-medium` over `open/20-low`, `open/20-low` over `dismissed`).',
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
          `PASS only if each discovery's returned status matches the expected outcome (match by title/content, not by exact event_id) AND is justified by the event's ` +
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
