/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EsqlQueryRunner } from '../../evaluators/esql_query_runner';
import { skippedResult } from '../../evaluator_utils';
import type { CustomContentEvaluator } from '../types';

export const CUSTOM_CONTENT_ROW_ORDER_EVALUATOR_NAME = 'Custom Content Row Order';

const TEXT_TYPES = new Set(['keyword', 'text']);

/**
 * Whether `labels` appear in `values` in order, ignoring case. A label matches any value that
 * contains it, so "Total flights" matches "1. Total Flights".
 */
export const labelsInOrder = (values: string[], labels: string[]): boolean => {
  let from = 0;
  for (const label of labels) {
    const index = values.findIndex(
      (value, i) => i >= from && value.toLowerCase().includes(label.toLowerCase())
    );
    if (index === -1) {
      return false;
    }
    from = index + 1;
  }
  return true;
};

/** The rows come back one per item, in the order the user listed them. */
export const createRowOrderEvaluator = ({
  runQuery,
}: {
  runQuery: EsqlQueryRunner;
}): CustomContentEvaluator => ({
  name: CUSTOM_CONTENT_ROW_ORDER_EVALUATOR_NAME,
  kind: 'CODE',
  direction: 'maximize',
  evaluate: async ({ output, expected }) => {
    const labels = expected?.rowOrder;
    if (!labels?.length) {
      return skippedResult('No expected row order declared for this example.');
    }

    const query = output.after?.esql;
    if (!query) {
      return { score: 0, label: 'no-query', explanation: 'The panel has no query.' };
    }

    let result;
    try {
      result = await runQuery(query);
    } catch (error) {
      return {
        score: 0,
        label: 'query-failed',
        explanation: `The query did not run: ${
          error instanceof Error ? error.message : String(error)
        }`,
      };
    }

    const { columns = [], values = [] } = result;
    const ordered = columns.some(({ name, type }, columnIndex) => {
      if (!TEXT_TYPES.has(type)) {
        return false;
      }
      return labelsInOrder(
        values.map((row) => String(row[columnIndex] ?? '')),
        labels
      );
    });

    return ordered
      ? {
          score: 1,
          label: 'in-order',
          explanation: `Rows come back in order: ${labels.join(', ')}.`,
        }
      : {
          score: 0,
          label: 'not-in-order',
          explanation: `No text column lists ${labels.join(
            ', '
          )} as rows in that order (a wide single row, a sort by value, or missing steps all fail this).`,
          metadata: { columns: columns.map(({ name }) => name), rows: values.length },
        };
  },
});
