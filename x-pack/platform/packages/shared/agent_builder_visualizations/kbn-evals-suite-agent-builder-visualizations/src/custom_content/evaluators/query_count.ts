/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { skippedResult } from '../../evaluator_utils';
import { getQueries } from '../custom_content_output';
import type { CustomContentEvaluator } from '../types';

export const CUSTOM_CONTENT_QUERY_COUNT_EVALUATOR_NAME = 'Custom Content Query Count';

/** The panel has as many queries as the request needs: not merged into one, not split without reason. */
export const createQueryCountEvaluator = (): CustomContentEvaluator => ({
  name: CUSTOM_CONTENT_QUERY_COUNT_EVALUATOR_NAME,
  kind: 'CODE',
  direction: 'maximize',
  evaluate: async ({ output, expected }) => {
    const wanted = expected?.queryCount;
    if (wanted === undefined) {
      return skippedResult('No expected query count declared for this example.');
    }
    if (!output.after) {
      return { score: 0, label: 'no-panel', explanation: 'The agent stored no panel.' };
    }

    const count = getQueries(output.after).filter((query) => query.trim().length > 0).length;
    const passed = typeof wanted === 'number' ? count === wanted : count >= wanted.min;
    const description = typeof wanted === 'number' ? `exactly ${wanted}` : `at least ${wanted.min}`;
    return passed
      ? {
          score: 1,
          label: 'expected-count',
          explanation: `The panel has ${count} queries, ${description} as expected.`,
          metadata: { count },
        }
      : {
          score: 0,
          label:
            count < (typeof wanted === 'number' ? wanted : wanted.min)
              ? 'too-few-queries'
              : 'too-many-queries',
          explanation: `Expected ${description} queries, found ${count}.`,
          metadata: { count },
        };
  },
});
