/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DiscoveryEvaluator } from '../../types';

/**
 * CODE evaluator: regression guard for the execute/store split introduced in the grounding skill.
 *
 * Asserts two invariants for every signal that has evidence:
 * 1. `evidence.esql_query` must not contain `| KEEP @timestamp` (the grounding projection tail
 *    that belongs only in the executed form, not the stored reader-facing form).
 * 2. `evidence.time_range.from`, when present, must parse as an absolute timestamp — datemath
 *    (`"now-15m"`) is rejected because it resolves to a different instant when opened in Discover.
 */
export const evidenceQueryShapeEvaluator: DiscoveryEvaluator = {
  name: 'evidence_query_shape',
  kind: 'CODE',
  evaluate: ({ output }) => {
    const issues: string[] = [];
    let checkedCount = 0;

    for (const event of output.significantEvents ?? []) {
      for (const signal of event.signals ?? []) {
        if (signal.type !== 'detection' || signal.evidence == null) {
          continue;
        }

        const { esql_query: esqlQuery, time_range: timeRange } = signal.evidence;
        if (!esqlQuery) {
          continue;
        }

        checkedCount++;
        const ruleUuid = signal.metadata?.rule_uuid ?? '<unknown>';

        if (/\|\s*KEEP\s+@timestamp\b/i.test(esqlQuery)) {
          issues.push(
            `rule "${ruleUuid}": evidence.esql_query contains the projection tail (| KEEP @timestamp) — store the pre-tail form only`
          );
        }

        if (/\bNOW\s*\(\s*\)/i.test(esqlQuery)) {
          issues.push(
            `rule "${ruleUuid}": evidence.esql_query contains NOW() — upper bound must be an absolute ISO-8601 timestamp matching evidence.time_range.to`
          );
        }

        if (timeRange?.from !== undefined) {
          const parsed = Date.parse(timeRange.from);
          if (Number.isNaN(parsed)) {
            issues.push(
              `rule "${ruleUuid}": evidence.time_range.from "${timeRange.from}" is not an absolute ISO-8601 timestamp`
            );
          }
        }
      }
    }

    if (checkedCount === 0) {
      return Promise.resolve({
        score: null,
        label: 'unavailable',
        explanation: 'No signals with esql evidence found — nothing to check',
      });
    }

    const issueCount = issues.length;
    const score = issueCount === 0 ? 1 : 0;
    return Promise.resolve({
      score,
      explanation:
        issueCount === 0
          ? `All ${checkedCount} evidence entries have the correct stored-query shape`
          : `${issueCount} violation(s) in ${checkedCount} evidence entries: ${issues.join('; ')}`,
    });
  },
};
