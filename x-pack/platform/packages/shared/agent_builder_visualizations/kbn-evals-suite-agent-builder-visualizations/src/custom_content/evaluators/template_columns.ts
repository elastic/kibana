/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EsqlQueryRunner } from '../../evaluators/esql_query_runner';
import { skippedResult } from '../../evaluator_utils';
import { getQueries } from '../custom_content_output';
import type { CustomContentEvaluator } from '../types';
import { readColumnReferencesByQuery } from './template_column_references';

export const CUSTOM_CONTENT_TEMPLATE_COLUMNS_EVALUATOR_NAME = 'Custom Content Template Columns';

/** Every column the template reads is a column of the query it reads it from, and every query it reads exists. */
export const createTemplateColumnsEvaluator = ({
  runQuery,
}: {
  runQuery: EsqlQueryRunner;
}): CustomContentEvaluator => ({
  name: CUSTOM_CONTENT_TEMPLATE_COLUMNS_EVALUATOR_NAME,
  kind: 'CODE',
  direction: 'maximize',
  evaluate: async ({ output }) => {
    const { template } = output.after ?? {};
    const queries = getQueries(output.after);
    if (!template || queries.length === 0) {
      return skippedResult('The panel has no template and query to compare.');
    }

    const references = readColumnReferencesByQuery(template);
    const read = [...references].filter(([, columns]) => columns.length > 0);
    const unknownQueries = [...references.keys()].filter((position) => position >= queries.length);
    if (read.length === 0 && unknownQueries.length === 0) {
      return skippedResult('The template reads no columns.');
    }

    const columnsByQuery = new Map<number, string[]>();
    for (const [position] of read) {
      if (position >= queries.length) {
        continue;
      }
      try {
        columnsByQuery.set(
          position,
          ((await runQuery(queries[position])).columns ?? []).map(({ name }) => name)
        );
      } catch (error) {
        return {
          score: 0,
          label: 'query-failed',
          explanation: `Query ${position} did not run: ${
            error instanceof Error ? error.message : String(error)
          }`,
        };
      }
    }

    const missing = read.flatMap(([position, columns]) =>
      position >= queries.length
        ? []
        : columns
            .filter((column) => !columnsByQuery.get(position)?.includes(column))
            .map((column) => (queries.length > 1 ? `${column} (query ${position})` : column))
    );
    const total =
      read
        .filter(([position]) => position < queries.length)
        .reduce((sum, [, columns]) => sum + columns.length, 0) + unknownQueries.length;
    const failed = missing.length + unknownQueries.length;
    const problems = [
      ...(missing.length > 0
        ? [`The template reads columns the query does not return: ${missing.join(', ')}.`]
        : []),
      ...(unknownQueries.length > 0
        ? [
            `The template reads queries the panel does not have: ${unknownQueries
              .map((position) => `queries[${position}]`)
              .join(', ')}.`,
          ]
        : []),
    ];

    return {
      score: (total - failed) / total,
      label: failed === 0 ? 'all-bound' : 'unbound-columns',
      explanation:
        failed === 0
          ? 'Every column the template reads is returned by the query it reads it from.'
          : problems.join(' '),
      metadata: {
        references: Object.fromEntries(references),
        columns: Object.fromEntries(columnsByQuery),
        missing,
        unknownQueries,
      },
    };
  },
});
