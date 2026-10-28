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

const IDENTIFIER = /^[A-Za-z_]\w*$/;

/** Whether the template reads the column, as `row["name"]` or, for a plain name, `row.name`. */
export const templateReadsColumn = (template: string, column: string): boolean =>
  new RegExp(`\\[\\s*["']${escapeRegExp(column)}["']\\s*\\]`).test(template) ||
  (IDENTIFIER.test(column) && new RegExp(`\\w\\.${escapeRegExp(column)}(?!\\w)`).test(template));

const withoutQuoting = (query: string): string => query.replace(/`/g, '').replace(/\s+/g, ' ');

/**
 * The names a query gives to the measure written as `expression`, such as `avg_bytes` for
 * `avg_bytes = AVG(bytes)`. Found from the expression, so a column the edit renamed is not mistaken
 * for the measure it added.
 */
export const findMeasureAliases = (query: string, expression: string): string[] => {
  const measure = escapeRegExp(withoutQuoting(expression).trim())
    .replace(/\\\(\s*/g, '\\(\\s*')
    .replace(/\s*\\\)/g, '\\s*\\)');
  const assignment = new RegExp(
    `(?:^|[,|]|\\b(?:STATS|EVAL)\\b)\\s*([^,|=]+?)\\s*=\\s*[^,|]*?${measure}`,
    'gi'
  );
  return [...withoutQuoting(query).matchAll(assignment)].map((match) =>
    match[1].trim().replace(/^(?:STATS|EVAL)\s+/i, '')
  );
};

/**
 * A data edit that adds a measure is only applied when the template shows it. Catches a panel
 * whose query gained the new measure while the template still draws the old content.
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
    const measure = expected?.addsMeasure;
    if (expected?.edit !== 'data' || !measure) {
      return skippedResult('This example is not a data edit that adds a measure.');
    }

    const { template, esql: query } = output.after ?? {};
    if (!template || !query) {
      return skippedResult('The panel has no template and query to compare.');
    }

    let columns: string[];
    try {
      columns = ((await runQuery(query)).columns ?? []).map(({ name }) => name);
    } catch {
      return skippedResult('The query did not run; the execution evaluator reports that.');
    }

    const aliases = findMeasureAliases(query, measure).filter((alias) => columns.includes(alias));
    if (aliases.length === 0) {
      return skippedResult(
        `The query has no returned column for ${measure}; the query contents evaluator reports that.`
      );
    }

    const shown = aliases.filter((alias) => templateReadsColumn(template, alias));
    return shown.length > 0
      ? {
          score: 1,
          label: 'new-measure-shown',
          explanation: `The template shows ${measure} as ${shown.join(', ')}.`,
        }
      : {
          score: 0,
          label: 'new-measure-not-shown',
          explanation: `The query returns ${measure} as ${aliases.join(
            ', '
          )} but the template does not read it.`,
          metadata: { aliases, columns },
        };
  },
});
