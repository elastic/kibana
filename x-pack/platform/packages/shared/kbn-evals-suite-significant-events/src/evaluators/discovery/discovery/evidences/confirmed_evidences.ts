/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DiscoveryEvaluator } from '../../types';
import { summarizeEsqlGrounding } from '../../utils/tool_usage';

/**
 * CODE evaluator: every `open` event must carry an `active` signal and the agent must
 * have run `execute_esql` this cycle. Score = valid open / open; null when none open.
 */
export const confirmedEvidencesEvaluator: DiscoveryEvaluator = {
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
        explanation: 'No open — active-signal invariant does not apply',
      });
    }

    const esqlCallCount = summarizeEsqlGrounding(steps ?? []).noOfToolCalls;
    // Require at least one execute_esql call per open event from Step 1 grounding.
    const sufficientEsqlCoverage = esqlCallCount >= openEvents.length;

    let satisfied = 0;
    const issues: string[] = [];

    openEvents.forEach((event, i) => {
      const signals = (event.signals ?? []).filter((s) => s.type === 'detection');
      const hasActiveSignal = signals.some((s) => s.verification?.assessment === 'active');

      if (hasActiveSignal && sufficientEsqlCoverage) {
        satisfied++;
      } else if (!sufficientEsqlCoverage) {
        issues.push(
          `[${i}] agent ran ${esqlCallCount} execute_esql call(s) for ${openEvents.length} open event(s) — insufficient per-event coverage`
        );
      } else {
        issues.push(`[${i}] open with no active signal`);
      }
    });

    const score = satisfied / openEvents.length;
    return Promise.resolve({
      score,
      explanation:
        issues.length > 0
          ? `${issues.join('; ')} (score=${score.toFixed(2)})`
          : `All ${openEvents.length} open event(s) backed by active, grounding-verified signals`,
    });
  },
};
