/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DiscoveryJudgeEvaluator } from '../../types';
import { summarizeEsqlGrounding } from '../../utils/tool_usage';

/**
 * CODE evaluator: every `open` event with `severity: "critical"` must carry a `confirmed: true`
 * signal and the judge must have run `execute_esql` this cycle.
 * Score = valid critical-open / critical-open; null when none qualify.
 */
export const confirmedEvidencesEvaluator: DiscoveryJudgeEvaluator = {
  name: 'confirmed_evidences',
  kind: 'CODE',
  evaluate: ({ output }) => {
    const { significantEvents, steps } = output;
    const events = significantEvents ?? [];
    const criticalOpen = events.filter((e) => e.status === 'open' && e.severity === 'critical');

    if (criticalOpen.length === 0) {
      return Promise.resolve({
        score: null,
        label: 'unavailable',
        explanation: 'No open+critical events — confirmed-signal invariant does not apply',
      });
    }

    const esqlCallCount = summarizeEsqlGrounding(steps ?? []).noOfToolCalls;
    // Require at least one execute_esql call per critical-open event. A single call shared
    // across all events cannot guarantee that each event was individually re-verified.
    const sufficientEsqlCoverage = esqlCallCount >= criticalOpen.length;

    let satisfied = 0;
    const issues: string[] = [];

    criticalOpen.forEach((event, i) => {
      const signals = event.signals ?? [];
      const hasConfirmed = signals.some((s) => s.confirmed === true);

      if (hasConfirmed && sufficientEsqlCoverage) {
        satisfied++;
      } else if (!sufficientEsqlCoverage) {
        issues.push(
          `[${i}] judge ran ${esqlCallCount} execute_esql call(s) for ${criticalOpen.length} critical-open event(s) — insufficient per-event coverage`
        );
      } else {
        issues.push(`[${i}] open/critical with no confirmed:true signal`);
      }
    });

    const score = satisfied / criticalOpen.length;
    return Promise.resolve({
      score,
      explanation:
        issues.length > 0
          ? `${issues.join('; ')} (score=${score.toFixed(2)})`
          : `All ${criticalOpen.length} open+critical event(s) backed by confirmed, freshly-verified signals`,
    });
  },
};
