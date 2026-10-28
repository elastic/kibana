/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { skippedResult } from '../../evaluator_utils';
import type { CustomContentEvaluator } from '../types';

export const CUSTOM_CONTENT_ROW_LIMIT_EVALUATOR_NAME = 'Custom Content Row Limit';

const CHART_DEFAULT_LIMIT = 10;

/** The `LIMIT` of the last command in the query, or undefined when it has none. */
export const readLimit = (query: string): number | undefined => {
  const matches = [...query.matchAll(/\bLIMIT\s+(\d+)/gi)];
  const last = matches[matches.length - 1];
  return last ? Number(last[1]) : undefined;
};

/**
 * A panel is not truncated by the chart default. With a declared limit the query must use exactly
 * it; without one, only the chart default of 10 is rejected.
 */
export const createRowLimitEvaluator = (): CustomContentEvaluator => ({
  name: CUSTOM_CONTENT_ROW_LIMIT_EVALUATOR_NAME,
  kind: 'CODE',
  direction: 'maximize',
  evaluate: async ({ output, expected }) => {
    const query = output.after?.esql;
    if (!query) {
      return skippedResult('The panel has no query.');
    }

    const limit = readLimit(query);
    const expectedLimit = expected?.limit;

    if (expectedLimit !== undefined) {
      return limit === expectedLimit
        ? {
            score: 1,
            label: 'expected-limit',
            explanation: `The query limits to ${expectedLimit}.`,
          }
        : {
            score: 0,
            label: 'wrong-limit',
            explanation: `Expected LIMIT ${expectedLimit}, found ${limit ?? 'none'}.`,
            metadata: { limit },
          };
    }

    return limit === CHART_DEFAULT_LIMIT
      ? {
          score: 0,
          label: 'chart-default-limit',
          explanation: 'The query uses the chart default LIMIT 10, which truncates a panel.',
          metadata: { limit },
        }
      : {
          score: 1,
          label: 'not-truncated',
          explanation:
            limit === undefined ? 'The query has no LIMIT.' : `The query limits to ${limit}.`,
          metadata: { limit },
        };
  },
});
