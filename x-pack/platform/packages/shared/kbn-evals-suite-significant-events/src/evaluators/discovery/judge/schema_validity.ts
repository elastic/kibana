/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { JudgeEvaluator, JudgeOutput } from '../types';

const VALID_STATUSES = new Set(['promoted', 'acknowledged', 'demoted', 'resolved']);
const VALID_IMPACTS = new Set(['critical', 'high', 'medium', 'low']);
const REQUIRED_FIELDS = [
  'event_id',
  'discovery_id',
  'discovery_slug',
  'status',
  'stream_names',
] as const;

/**
 * CODE evaluator: validates required `SigEvent` fields and that
 * `status` and `impact` values are within allowed sets.
 * Score = valid_docs / total_docs.
 */
export const schemaValidityJudgeEvaluator: JudgeEvaluator = {
  name: 'schema_validity',
  kind: 'CODE',
  evaluate: ({ output }) => {
    const events = (output as JudgeOutput)?.significantEvents ?? [];

    if (events.length === 0) {
      return Promise.resolve({ score: 0, explanation: 'No significant events returned' });
    }

    let validCount = 0;
    const issues: string[] = [];

    for (const [i, event] of events.entries()) {
      const doc = event as Record<string, unknown>;
      const missing = REQUIRED_FIELDS.filter((f) => doc[f] == null);
      if (missing.length > 0) {
        issues.push(`[${i}] missing fields: ${missing.join(', ')}`);
        continue;
      }
      if (!VALID_STATUSES.has(doc.status as string)) {
        issues.push(`[${i}] invalid status: ${doc.status}`);
        continue;
      }
      if (doc.impact != null && !VALID_IMPACTS.has(doc.impact as string)) {
        issues.push(`[${i}] invalid impact: ${doc.impact}`);
        continue;
      }
      validCount++;
    }

    const score = validCount / events.length;
    return Promise.resolve({
      score,
      explanation:
        issues.length > 0
          ? `${issues.join('; ')} (score=${score.toFixed(2)})`
          : `All ${events.length} significant events have valid schema`,
    });
  },
};
