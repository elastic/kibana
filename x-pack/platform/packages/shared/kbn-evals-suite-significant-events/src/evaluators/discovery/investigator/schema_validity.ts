/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { InvestigatorEvaluator, InvestigatorOutput } from '../types';

const VALID_KINDS = new Set(['discovery', 'clearance', 'handled']);

const REQUIRED_FIELDS = [
  'kind',
  'title',
  'summary',
  'discovery_id',
  'discovery_slug',
  'detections',
] as const;

/**
 * CODE evaluator: validates that each discovery has all required fields and
 * a valid `kind`. Score = valid_docs / total_docs.
 */
export const schemaValidityInvestigatorEvaluator: InvestigatorEvaluator = {
  name: 'schema_validity',
  kind: 'CODE',
  evaluate: ({ output }) => {
    const discoveries = (output as InvestigatorOutput)?.discoveries ?? [];

    if (discoveries.length === 0) {
      return Promise.resolve({ score: 0, explanation: 'No discoveries returned' });
    }

    let validCount = 0;
    const issues: string[] = [];

    for (const [i, discovery] of discoveries.entries()) {
      const doc = discovery as Record<string, unknown>;
      const missing = REQUIRED_FIELDS.filter((f) => doc[f] == null);
      if (missing.length > 0) {
        issues.push(`[${i}] missing fields: ${missing.join(', ')}`);
        continue;
      }
      if (!VALID_KINDS.has(doc.kind as string)) {
        issues.push(`[${i}] invalid kind: ${doc.kind}`);
        continue;
      }
      validCount++;
    }

    const score = validCount / discoveries.length;
    return Promise.resolve({
      score,
      explanation:
        issues.length > 0
          ? `${issues.join('; ')} (score=${score.toFixed(2)})`
          : `All ${discoveries.length} discoveries have valid schema`,
    });
  },
};
