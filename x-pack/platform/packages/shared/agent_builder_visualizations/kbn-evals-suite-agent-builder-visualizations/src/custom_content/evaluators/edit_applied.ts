/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { BasicPrettyPrinter } from '@elastic/esql';
import { getQuerySummary } from '@kbn/esql-utils';
import type { EsqlQueryRunner } from '../../evaluators/esql_query_runner';
import { skippedResult } from '../../evaluator_utils';
import type { CustomContentEvaluator } from '../types';
import { readColumnReferences } from './template_column_references';

export const CUSTOM_CONTENT_EDIT_APPLIED_EVALUATOR_NAME = 'Custom Content Data Edit Applied';

const simplify = (text: string): string => text.replace(/[\s`]/g, '').toLowerCase();

/**
 * Where the measure written as `measure` is in a query. `computed` is whether a STATS command
 * computes it, and `returned` the columns of the result that hold it: the name given in an
 * assignment (`avg_bytes = AVG(bytes)`) or, with no name, the expression itself (`AVG(bytes)`).
 * It is found from the measure, not from the column names, so a column the edit renamed is not
 * mistaken for the measure it added.
 */
export const findMeasureColumns = (
  query: string,
  measure: string,
  columns: string[]
): { computed: boolean; returned: string[] } => {
  const wanted = simplify(measure);
  const names = [...(getQuerySummary(query).aggregates ?? [])]
    .filter(({ arg }) => simplify(BasicPrettyPrinter.print(arg)).includes(wanted))
    .map(({ field }) => simplify(field));

  return {
    computed: names.length > 0,
    returned: columns.filter((column) => names.includes(simplify(column))),
  };
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

    const { computed, returned } = findMeasureColumns(query, measure, columns);
    if (!computed) {
      return {
        score: 0,
        label: 'measure-not-in-query',
        explanation: `The edited query does not compute ${measure}.`,
      };
    }
    if (returned.length === 0) {
      return {
        score: 0,
        label: 'measure-not-returned',
        explanation: `The query computes ${measure} but does not return it, for example because a KEEP drops it.`,
        metadata: { columns },
      };
    }

    const read = readColumnReferences(template);
    const shown = returned.filter((column) => read.includes(column));
    return shown.length > 0
      ? {
          score: 1,
          label: 'new-measure-shown',
          explanation: `The template shows ${measure} as ${shown.join(', ')}.`,
        }
      : {
          score: 0,
          label: 'new-measure-not-shown',
          explanation: `The query returns ${measure} as ${returned.join(
            ', '
          )} but the template does not read it.`,
          metadata: { returned, columns },
        };
  },
});
