/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EsqlQueryRunner } from '../../evaluators/esql_query_runner';
import { skippedResult } from '../../evaluator_utils';
import type { CustomContentEvaluator } from '../types';

export const CUSTOM_CONTENT_EDIT_APPLIED_EVALUATOR_NAME = 'Custom Content Data Edit Applied';

const escapeRegExp = (text: string): string => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export const templateReadsColumn = (template: string, column: string): boolean =>
  new RegExp(`\\[\\s*["']${escapeRegExp(column)}["']\\s*\\]`).test(template);

const readColumnNames = async (runQuery: EsqlQueryRunner, query: string): Promise<string[]> =>
  ((await runQuery(query)).columns ?? []).map(({ name }) => name);

/**
 * A data edit that adds a column is only applied when the template shows it. Catches a panel whose
 * query gained the new measure while the template still draws the old content.
 */
export const createDataEditAppliedEvaluator = ({
  runQuery,
}: {
  runQuery: EsqlQueryRunner;
}): CustomContentEvaluator => ({
  name: CUSTOM_CONTENT_EDIT_APPLIED_EVALUATOR_NAME,
  kind: 'CODE',
  direction: 'maximize',
  evaluate: async ({ output, expected }) => {
    if (expected?.edit !== 'data' || !expected.addsColumn) {
      return skippedResult('This example is not a data edit that adds a column.');
    }

    const { template, esql: afterQuery } = output.after ?? {};
    if (!template || !afterQuery) {
      return skippedResult('The panel has no template and query to compare.');
    }

    let afterColumns: string[];
    let beforeColumns: string[] = [];
    try {
      afterColumns = await readColumnNames(runQuery, afterQuery);
      const beforeQuery = output.baseline?.content?.esql;
      if (beforeQuery) {
        beforeColumns = await readColumnNames(runQuery, beforeQuery);
      }
    } catch {
      return skippedResult('A query did not run; the execution evaluator reports that.');
    }

    const added = afterColumns.filter((column) => !beforeColumns.includes(column));
    if (added.length === 0) {
      return {
        score: 0,
        label: 'no-new-column',
        explanation: 'The edit changed the query but it returns no column the original did not.',
        metadata: { afterColumns, beforeColumns },
      };
    }

    const shown = added.filter((column) => templateReadsColumn(template, column));
    return shown.length > 0
      ? {
          score: 1,
          label: 'new-column-shown',
          explanation: `The template shows the added column: ${shown.join(', ')}.`,
        }
      : {
          score: 0,
          label: 'new-column-not-shown',
          explanation: `The query gained ${added.join(', ')} but the template does not read it.`,
          metadata: { added },
        };
  },
});
