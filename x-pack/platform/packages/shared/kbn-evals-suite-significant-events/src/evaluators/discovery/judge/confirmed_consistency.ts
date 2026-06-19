/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { JudgeEvaluator, JudgeOutput } from '../types';
import { normalizeWhitespace } from '../../common/matches_evidence_text';

/**
 * CODE evaluator: for each evidence entry with `confirmed: true` in the
 * input discoveries, checks that the corresponding
 * `toolUsage.execute_esql_per_evidence` entry has `returned_rows: true`.
 *
 * Score = consistent_confirmations / total_confirmations.
 * Score 1 if no `confirmed: true` entries.
 *
 * NOTE: This evaluator is only reliable on pinned static fixture data.
 * In live runs, a query the investigator confirmed may return no rows if
 * data aged out between the investigator and judge runs — the judge behaved
 * correctly but this evaluator would score it 0. Use only with snapshot-backed
 * scenarios where the data is frozen.
 */
export const confirmedConsistencyEvaluator: JudgeEvaluator = {
  name: 'confirmed_consistency',
  kind: 'CODE',
  evaluate: ({ output }) => {
    const { inputDiscoveries, toolUsage } = output as JudgeOutput;
    const evidenceMap = toolUsage?.execute_esql_per_evidence ?? {};

    let totalConfirmations = 0;
    let consistentConfirmations = 0;
    const issues: string[] = [];

    for (const discovery of inputDiscoveries ?? []) {
      const evidences = (discovery as Record<string, unknown>).evidences as
        | Array<Record<string, unknown>>
        | undefined;
      if (!evidences) continue;

      for (const ev of evidences) {
        if (!ev.confirmed) continue;

        const q = ev.esql_query as string | null | undefined;
        if (!q) continue;

        totalConfirmations++;
        const key = normalizeWhitespace(q);
        const record = evidenceMap[key];

        if (record?.returned_rows) {
          consistentConfirmations++;
        } else {
          issues.push(
            `confirmed:true evidence but no rows returned for query: "${q.slice(0, 60)}"`
          );
        }
      }
    }

    if (totalConfirmations === 0) {
      return Promise.resolve({
        score: 1,
        explanation: 'No confirmed:true evidence entries — nothing to check',
      });
    }

    const score = consistentConfirmations / totalConfirmations;
    return Promise.resolve({
      score,
      explanation:
        issues.length > 0
          ? `${issues.join('; ')} (score=${score.toFixed(2)})`
          : `All ${totalConfirmations} confirmed evidence entries have returned rows`,
    });
  },
};
