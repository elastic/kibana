/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DiscoveryJudgeEvaluator } from '../../types';
import { summarizeEsqlGrounding } from '../../utils/tool_usage';

/**
 * CODE evaluator: every `open` event must carry a `confirmed: true` signal and the judge must
 * have run `execute_esql` this cycle. Score = valid open / open; null when none open.
 */
export const confirmedEvidencesEvaluator: DiscoveryJudgeEvaluator = {
  name: 'confirmed_evidences',
  kind: 'CODE',
  evaluate: ({ output }) => {
    const { significantEvents, steps } = output;
    const events = significantEvents ?? [];
    const openEvents = events.filter((e) => e.status === 'open');

    if (openEvents.length === 0) {
      return Promise.resolve({
        score: null,
        label: 'unavailable',
        explanation: 'No open — confirmed-signal invariant does not apply',
      });
    }

    const esqlCallCount = summarizeEsqlGrounding(steps ?? []).noOfToolCalls;
    // Require at least one execute_esql call per open event. A single call shared
    // across all promotions cannot guarantee that each event was individually re-verified.
    const sufficientEsqlCoverage = esqlCallCount >= openEvents.length;

    let satisfied = 0;
    const issues: string[] = [];

    openEvents.forEach((event, i) => {
      const signals = (event.signals ?? []).filter((s) => s.type === 'detection');
      const hasConfirmed = signals.some((s) => s.confirmed === true);

      if (hasConfirmed && sufficientEsqlCoverage) {
        satisfied++;
      } else if (!sufficientEsqlCoverage) {
        issues.push(
          `[${i}] judge ran ${esqlCallCount} execute_esql call(s) for ${openEvents.length} open event(s) — insufficient per-event coverage`
        );
      } else {
        issues.push(`[${i}] open with no confirmed:true signal`);
      }
    });

    const score = satisfied / openEvents.length;
    return Promise.resolve({
      score,
      explanation:
        issues.length > 0
          ? `${issues.join('; ')} (score=${score.toFixed(2)})`
          : `All ${openEvents.length} open event(s) backed by confirmed, freshly-verified signals`,
    });
  },
};
