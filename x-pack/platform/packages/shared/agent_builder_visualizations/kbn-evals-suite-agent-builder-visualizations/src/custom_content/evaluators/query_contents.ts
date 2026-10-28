/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { skippedResult } from '../../evaluator_utils';
import type { CustomContentEvaluator } from '../types';

export const CUSTOM_CONTENT_QUERY_CONTENTS_EVALUATOR_NAME = 'Custom Content Query Contents';

/** Ignores case, whitespace and the backticks that quote a name, so `AVG( \`bytes\` )` matches `avg(bytes)`. */
export const normalizeQuery = (query: string): string => query.replace(/[`\s]/g, '').toLowerCase();

/** The final query contains the expected text, for a user-supplied query or a kept grouping. */
export const createQueryContentsEvaluator = (): CustomContentEvaluator => ({
  name: CUSTOM_CONTENT_QUERY_CONTENTS_EVALUATOR_NAME,
  kind: 'CODE',
  direction: 'maximize',
  evaluate: async ({ output, expected }) => {
    const required = expected?.queryContains;
    if (!required?.length) {
      return skippedResult('No expected query text declared for this example.');
    }

    const query = output.after?.esql;
    if (!query) {
      return { score: 0, label: 'no-query', explanation: 'The panel has no query.' };
    }

    const normalized = normalizeQuery(query);
    const missing = required.filter((text) => !normalized.includes(normalizeQuery(text)));
    const score = (required.length - missing.length) / required.length;

    return {
      score,
      label: missing.length === 0 ? 'contains-all' : 'missing',
      explanation:
        missing.length === 0
          ? 'The query contains every expected text.'
          : `The query is missing: ${missing.join('; ')}.`,
      metadata: { esql: query, missing },
    };
  },
});
