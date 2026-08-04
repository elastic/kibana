/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EvaluationCriterion, Evaluator } from '@kbn/evals';
import type { DiscoveryJudgeEvaluationExample, DiscoveryJudgeAgentOutput } from '../../types';

/** Status decision gates, mirrored from the judge instructions. Severity is graded separately. */
const STATUS_DECISION_RUBRIC = [
  "Grade whether the agent's `status` for each event is correct given the gates below. Do not grade severity; the severity-calibration evaluator owns that decision.",
  'You cannot run queries. Use the signal counts in the summary and the agent output evidence.',
  '',
  'Status gates:',
  '- `open`: a current failure, material degradation, or sensitive-data exposure is confirmed, or a verification gap leaves one of those conditions plausible.',
  '- `status: "dismissed"`: the proposed incident is a false alarm, benign/positive change, unrelated finding, or non-confirming finding (`confirmedSignalCount == 0`), with no plausible failure, degradation, or exposure left unverified.',
  '- `closed` is a recovery state, not the disposition for a healthy or positive predicate. For an active or ambiguous failure shape it requires both a fresh re-verification with no active failure rows and a broad `COUNT(*)` confirming live telemetry.',
  '- `closed` for a settled episode requires every signal to be settled/downward. Carried settled signals are trusted; each fresh settled signal requires a recovery-lens query with no active failure rows. Shape alone is insufficient.',
  '',
  'Hard constraints: a matching healthy or positive row is verified but does not confirm an incident; mark it rejected and dismiss when no failure, degradation, or exposure remains. A query error or telemetry gap is not recovery and requires `open` only when one of those conditions remains plausible. A `dip` alone establishes neither active failure nor recovery.',
].join('\n');

/**
 * LLM evaluator: grades whether `status` matches the IC decision gates.
 * Severity is graded by the dedicated severity-calibration evaluator.
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
      confirmedSignalCount: (e.signals ?? []).filter((s) => s.confirmed === true).length,
      rejectedSignalCount: (e.signals ?? []).filter((s) => s.confirmed === false).length,
      unverifiedSignalCount: (e.signals ?? []).filter((s) => s.confirmed === undefined).length,
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
          `signals and the gates above. Ignore severity in this evaluator. A status or constraint violation is a FAIL even if it is "close".`,
      },
    ];

    return criteriaFn(criteria).evaluate({
      ...params,
      output,
    });
  },
});
