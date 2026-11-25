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

/** Gives each declared limit a different query that has exactly it; the queries nobody claimed are left free. */
const matchDeclaredLimits = (
  limits: Array<number | undefined>,
  declared: number[]
): { checks: LimitCheck[]; free: number[] } => {
  const free = limits.map((_, position) => position);
  const checks = declared.map((expectedLimit): LimitCheck => {
    const at = free.findIndex((position) => limits[position] === expectedLimit);
    if (at === -1) {
      const found = limits.map((limit) => limit ?? 'none').join(', ');
      return {
        passed: false,
        label: 'wrong-limit',
        explanation: `Expected LIMIT ${expectedLimit}, found ${found}.`,
      };
    }
    free.splice(at, 1);
    return {
      passed: true,
      label: 'expected-limit',
      explanation: `The query limits to ${expectedLimit}.`,
    };
  });
  return { checks, free };
};

/** A declared limit nobody has was meant for one of the free queries, so one fewer is scored; the chart default is the least likely to be it. */
const queriesLeftToScore = (
  limits: Array<number | undefined>,
  free: number[],
  missedLimits: number
): number[] =>
  [...free]
    .sort(
      (a, b) =>
        Number(limits[a] === CHART_DEFAULT_LIMIT) - Number(limits[b] === CHART_DEFAULT_LIMIT)
    )
    .slice(missedLimits);

const checkAgainstChartDefault = (limit: number | undefined): LimitCheck =>
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
      };

/** Each declared limit is the exact `LIMIT` of a different query, and no other query uses the chart default of 10. */
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
    const { checks: limitChecks, free } = matchDeclaredLimits(limits, declared);
    const missedLimits = limitChecks.filter(({ passed }) => !passed).length;
    const checks = [
      ...limitChecks,
      ...queriesLeftToScore(limits, free, missedLimits).map((position) =>
        checkAgainstChartDefault(limits[position])
      ),
    ];

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
