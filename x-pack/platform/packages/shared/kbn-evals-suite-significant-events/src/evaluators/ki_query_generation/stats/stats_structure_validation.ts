/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { deriveQueryType, getStatsQueryHints, QUERY_TYPE_STATS } from '@kbn/streams-schema';
import type { KIQueryGenerationEvaluator } from '../types';
import { getQueriesFromOutput } from '../types';

interface StatsQueryDetail {
  esql: string;
  title: string;
  checksTotal: number;
  checksPassed: number;
  hints: string[];
}

const CHECKS_PER_QUERY = 5;

/**
 * Validates the structural quality of STATS-type queries using the same
 * guardrails enforced `getStatsQueryHints`
 *
 * For each STATS query, checks:
 * - Has temporal bucketing (BUCKET(@timestamp, ...))
 * - Has threshold filter after STATS (| WHERE ...)
 * - Has sample-size floor (heuristic)
 * - No forbidden commands after STATS (SORT, LIMIT, KEEP)
 * - No excessive GROUP BY dimensions (>2 non-temporal)
 *
 * Returns `null` if no STATS queries are present.
 */
export const statsStructureValidationEvaluator: KIQueryGenerationEvaluator = {
  name: 'stats_structure_validation',
  kind: 'CODE' as const,
  evaluate: async ({ output }) => {
    const queries = getQueriesFromOutput(output);
    const statsQueries = queries.filter((q) => deriveQueryType(q.esql) === QUERY_TYPE_STATS);

    if (statsQueries.length === 0) {
      return { score: null, explanation: 'No STATS queries to validate' };
    }

    const perQueryDetails: StatsQueryDetail[] = [];

    for (const query of statsQueries) {
      const hints = getStatsQueryHints(query.esql);

      const hasBucketingIssue = hints.some((h) => h.includes('no temporal bucketing'));
      const hasThresholdIssue = hints.some((h) => h.includes('No threshold filter'));
      const hasSampleFloorIssue = hints.some((h) => h.includes('sample-size floor'));
      const hasForbiddenCmds = hints.some((h) => /SORT|LIMIT|KEEP.*should not be used/.test(h));
      const hasGroupByIssue = hints.some((h) => h.includes('GROUP BY dimensions'));

      let checksPassed = CHECKS_PER_QUERY;
      if (hasBucketingIssue) checksPassed--;
      if (hasThresholdIssue) checksPassed--;
      if (hasSampleFloorIssue) checksPassed--;
      if (hasForbiddenCmds) checksPassed--;
      if (hasGroupByIssue) checksPassed--;

      perQueryDetails.push({
        esql: query.esql,
        title: query.title,
        checksTotal: CHECKS_PER_QUERY,
        checksPassed,
        hints,
      });
    }

    const score =
      perQueryDetails.reduce((sum, d) => sum + d.checksPassed / d.checksTotal, 0) /
      perQueryDetails.length;

    const issueQueries = perQueryDetails.filter((d) => d.checksPassed < d.checksTotal);
    const issueLines = issueQueries.map(
      (d) => `"${d.title}" (${d.checksPassed}/${d.checksTotal}): ${d.hints.join('; ')}`
    );

    return {
      score,
      explanation:
        issueLines.length > 0
          ? `STATS structure issues: ${issueLines.join(' | ')}`
          : `All ${statsQueries.length} STATS queries pass structural validation`,
      details: {
        totalStatsQueries: statsQueries.length,
        perQuery: perQueryDetails,
      },
    };
  },
};
