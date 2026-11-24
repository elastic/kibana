/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { skippedResult } from '../../evaluator_utils';
import { getQueries } from '../custom_content_output';
import type { CustomContentEvaluator } from '../types';

export const CUSTOM_CONTENT_ROW_LIMIT_EVALUATOR_NAME = 'Custom Content Row Limit';

const CHART_DEFAULT_LIMIT = 10;

/** The `LIMIT` of the last command in the query, or undefined when it has none. */
export const readLimit = (query: string): number | undefined => {
  const matches = [...query.matchAll(/\bLIMIT\s+(\d+)/gi)];
  const last = matches[matches.length - 1];
  return last ? Number(last[1]) : undefined;
};

interface LimitCheck {
  passed: boolean;
  label: string;
  explanation: string;
}

/**
 * A panel is not truncated by the chart default. Each declared limit must be the exact `LIMIT` of
 * a different query, whatever its position; a query no declared limit matches only has to avoid
 * the chart default of 10.
 */
export const createRowLimitEvaluator = (): CustomContentEvaluator => ({
  name: CUSTOM_CONTENT_ROW_LIMIT_EVALUATOR_NAME,
  kind: 'CODE',
  direction: 'maximize',
  evaluate: async ({ output, expected }) => {
    const queries = getQueries(output.after);
    if (queries.length === 0) {
      return skippedResult('The panel has no query.');
    }

    const limits = queries.map(readLimit);
    const declared = expected?.limit === undefined ? [] : [expected.limit].flat();
    const unmatched = limits.map((_, position) => position);

    const checks: LimitCheck[] = declared.map((expectedLimit) => {
      const at = unmatched.findIndex((position) => limits[position] === expectedLimit);
      if (at === -1) {
        return {
          passed: false,
          label: 'wrong-limit',
          explanation: `Expected LIMIT ${expectedLimit}, found ${limits
            .map((limit) => limit ?? 'none')
            .join(', ')}.`,
        };
      }
      unmatched.splice(at, 1);
      return {
        passed: true,
        label: 'expected-limit',
        explanation: `The query limits to ${expectedLimit}.`,
      };
    });

    // A declared limit no query has was meant for one of the others, which it already fails, so
    // that query is not scored again; one using the chart default is the least likely to be it.
    const missed = checks.filter(({ passed }) => !passed).length;
    const remaining = [...unmatched]
      .sort(
        (a, b) =>
          Number(limits[a] === CHART_DEFAULT_LIMIT) - Number(limits[b] === CHART_DEFAULT_LIMIT)
      )
      .slice(missed);

    remaining.forEach((position) => {
      const limit = limits[position];
      checks.push(
        limit === CHART_DEFAULT_LIMIT
          ? {
              passed: false,
              label: 'chart-default-limit',
              explanation: 'The query uses the chart default LIMIT 10, which truncates a panel.',
            }
          : {
              passed: true,
              label: 'not-truncated',
              explanation:
                limit === undefined ? 'The query has no LIMIT.' : `The query limits to ${limit}.`,
            }
      );
    });

    const failed = checks.filter(({ passed }) => !passed);
    const [first] = failed.length > 0 ? failed : checks;
    return {
      score: (checks.length - failed.length) / checks.length,
      label: first.label,
      explanation:
        failed.length > 0
          ? [...new Set(failed.map(({ explanation }) => explanation))].join(' ')
          : first.explanation,
      metadata: { limit: limits[0], limits },
    };
  },
});
