/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { InvestigatorEvaluator, InvestigatorOutput } from '../types';
import { normalizeWhitespace } from '../../common/matches_evidence_text';

/**
 * CODE evaluator: for each evidence entry in each output discovery, checks that
 * `toolUsage.execute_esql_per_evidence` has an entry with `called: true`.
 * Score = grounded_entries / total_entries. Score null if no evidence entries.
 *
 * Catches hallucinated evidence — output entries whose esql_query was never
 * actually executed during the inference loop.
 */
export const executeEsqlCoverageEvaluator: InvestigatorEvaluator = {
  name: 'execute_esql_coverage',
  kind: 'CODE',
  evaluate: ({ output }) => {
    const { discoveries, toolUsage } = output as InvestigatorOutput;
    const evidenceMap = toolUsage?.execute_esql_per_evidence ?? {};

    let totalEntries = 0;
    let groundedEntries = 0;
    const issues: string[] = [];

    for (const discovery of discoveries ?? []) {
      const evidences = (discovery as Record<string, unknown>).evidences as
        | Array<Record<string, unknown>>
        | undefined;
      if (!evidences) continue;

      for (const ev of evidences) {
        const q = ev.esql_query as string | null | undefined;
        if (!q) continue;

        totalEntries++;
        const key = normalizeWhitespace(q);
        if (evidenceMap[key]?.called) {
          groundedEntries++;
        } else {
          issues.push(`No execute_esql call found for query: "${q.slice(0, 60)}"`);
        }
      }
    }

    if (totalEntries === 0) {
      return Promise.resolve({
        score: null,
        label: 'unavailable',
        explanation: 'No evidence entries with esql_query found',
      });
    }

    const score = groundedEntries / totalEntries;
    return Promise.resolve({
      score,
      explanation:
        issues.length > 0
          ? `${issues.join('; ')} (score=${score.toFixed(2)})`
          : `All ${totalEntries} evidence entries are grounded in execute_esql calls`,
    });
  },
};
