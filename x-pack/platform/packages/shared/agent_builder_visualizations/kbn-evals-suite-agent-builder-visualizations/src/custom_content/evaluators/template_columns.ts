/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EsqlQueryRunner } from '../../evaluators/esql_query_runner';
import { skippedResult } from '../../evaluator_utils';
import type { CustomContentEvaluator } from '../types';
import { readColumnReferences } from './template_column_references';

export const CUSTOM_CONTENT_TEMPLATE_COLUMNS_EVALUATOR_NAME = 'Custom Content Template Columns';

/** Every column the template reads is a column the query returns. */
export const createTemplateColumnsEvaluator = ({
  runQuery,
}: {
  runQuery: EsqlQueryRunner;
}): CustomContentEvaluator => ({
  name: CUSTOM_CONTENT_TEMPLATE_COLUMNS_EVALUATOR_NAME,
  kind: 'CODE',
  direction: 'maximize',
  evaluate: async ({ output }) => {
    const { template, esql } = output.after ?? {};
    if (!template || !esql) {
      return skippedResult('The panel has no template and query to compare.');
    }

    const references = readColumnReferences(template);
    if (references.length === 0) {
      return skippedResult('The template reads no columns.');
    }

    let columnNames: string[];
    try {
      columnNames = ((await runQuery(esql)).columns ?? []).map(({ name }) => name);
    } catch (error) {
      return {
        score: 0,
        label: 'query-failed',
        explanation: `The query did not run: ${
          error instanceof Error ? error.message : String(error)
        }`,
      };
    }

    const missing = references.filter((reference) => !columnNames.includes(reference));
    return {
      score: (references.length - missing.length) / references.length,
      label: missing.length === 0 ? 'all-bound' : 'unbound-columns',
      explanation:
        missing.length === 0
          ? 'Every column the template reads is returned by the query.'
          : `The template reads columns the query does not return: ${missing.join(', ')}.`,
      metadata: { references, columns: columnNames, missing },
    };
  },
});
