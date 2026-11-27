/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { skippedResult } from '../../evaluator_utils';
import { getQueries } from '../custom_content_output';
import type { CustomContentEvaluator } from '../types';
import { readColumnReferencesByQuery } from './template_column_references';

export const CUSTOM_CONTENT_QUERIES_USED_EVALUATOR_NAME = 'Custom Content Queries Used';

/** Every query of a panel with several is read by the template. */
export const createQueriesUsedEvaluator = (): CustomContentEvaluator => ({
  name: CUSTOM_CONTENT_QUERIES_USED_EVALUATOR_NAME,
  kind: 'CODE',
  direction: 'maximize',
  evaluate: async ({ output }) => {
    const queries = getQueries(output.after);
    const { template } = output.after ?? {};
    if (queries.length < 2 || !template) {
      return skippedResult('The panel has no template and several queries.');
    }

    const references = readColumnReferencesByQuery(template);
    const unused = queries
      .map((_, position) => position)
      .filter((position) => !references.has(position));
    return unused.length === 0
      ? { score: 1, label: 'all-used', explanation: 'The template reads every query.' }
      : {
          score: (queries.length - unused.length) / queries.length,
          label: 'unused-queries',
          explanation: `The template never reads ${unused
            .map((position) => (position === 0 ? 'rows' : `queries[${position}]`))
            .join(', ')}, so ${
            unused.length === 1 ? 'that query is' : 'those queries are'
          } fetched for nothing.`,
          metadata: { unused, queries: queries.length },
        };
  },
});
