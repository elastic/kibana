/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { JudgeEvaluator, JudgeOutput } from '../types';
import { normalizeWhitespace } from '../../common/matches_evidence_text';

/**
 * CODE evaluator: for each evidence entry in each discovery, checks that
 * `toolUsage.execute_esql_per_evidence` has an entry with `called: true`.
 * Score = verified_entries / total_entries. Score null if no evidence entries.
 *
 * INVARIANT: this evaluator compares keys by normalizing `evidence.esql_query`
 * (what the investigator stored) against keys in `execute_esql_per_evidence`
 * (populated by normalizing the actual query the judge called). These match
 * only when the judge passes the evidence query string verbatim to `execute_esql`.
 * The judge system prompt must instruct it to do so — any rephrasing produces
 * a key miss and a falsely low score.
 */
export const executeEsqlCoverageEvaluator: JudgeEvaluator = {
  name: 'execute_esql_coverage',
  kind: 'CODE',
  evaluate: ({ output }) => {
    const { inputDiscoveries, toolUsage } = output as JudgeOutput;
    const evidenceMap = toolUsage?.execute_esql_per_evidence ?? {};

    let totalEntries = 0;
    let verifiedEntries = 0;
    const issues: string[] = [];

    for (const discovery of inputDiscoveries ?? []) {
      const evidences = (discovery as Record<string, unknown>).evidences as
        | Array<Record<string, unknown>>
        | undefined;
      if (!evidences) continue;

      for (const ev of evidences) {
        const q = ev.esql_query as string | null | undefined;
        if (!q) continue;

        totalEntries++;
        const key = normalizeWhitespace(q);
        const record = evidenceMap[key];
        if (record?.called) {
          verifiedEntries++;
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

    const score = verifiedEntries / totalEntries;
    return Promise.resolve({
      score,
      explanation:
        issues.length > 0
          ? `${issues.join('; ')} (score=${score.toFixed(2)})`
          : `All ${totalEntries} evidence entries were verified with execute_esql`,
    });
  },
};
