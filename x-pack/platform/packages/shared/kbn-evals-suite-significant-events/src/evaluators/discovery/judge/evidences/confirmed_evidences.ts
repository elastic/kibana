/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { JudgeEvaluator, JudgeOutput } from '../../types';
import { summarizeEsqlGrounding } from '../../utils/tool_usage';

/**
 * CODE evaluator (hard invariant): the judge may only `promote` an event after confirming it with
 * its own `execute_esql`. So every `promoted` event must carry at least one evidence stamped
 * `confirmed: true`, and the judge must actually have run `execute_esql` this cycle. This catches a
 * judge that pages on stale/unverified evidence.
 *
 * Score = promoted events satisfying the invariant / promoted events. Skips (null) when nothing was
 * promoted — there is no invariant to check.
 */
export const confirmedEvidencesEvaluator: JudgeEvaluator = {
  name: 'confirmed_evidences',
  kind: 'CODE',
  evaluate: ({ output }) => {
    const { significantEvents, steps } = output as JudgeOutput;
    const events = significantEvents ?? [];
    const promoted = events.filter((e) => (e as Record<string, unknown>).status === 'promoted');

    if (promoted.length === 0) {
      return Promise.resolve({
        score: null,
        label: 'unavailable',
        explanation: 'No promoted events — confirmed-evidence invariant does not apply',
      });
    }

    const esqlRan = summarizeEsqlGrounding(steps ?? []).calls > 0;

    let satisfied = 0;
    const issues: string[] = [];

    promoted.forEach((event, i) => {
      const evidences = ((event as Record<string, unknown>).evidences ?? []) as Array<
        Record<string, unknown>
      >;
      const hasConfirmed = evidences.some((ev) => ev.confirmed === true);

      if (hasConfirmed && esqlRan) {
        satisfied++;
      } else if (!esqlRan) {
        issues.push(`[${i}] promoted but the judge never ran execute_esql`);
      } else {
        issues.push(`[${i}] promoted with no confirmed:true evidence`);
      }
    });

    const score = satisfied / promoted.length;
    return Promise.resolve({
      score,
      explanation:
        issues.length > 0
          ? `${issues.join('; ')} (score=${score.toFixed(2)})`
          : `All ${promoted.length} promoted event(s) backed by confirmed, freshly-verified evidence`,
    });
  },
};
