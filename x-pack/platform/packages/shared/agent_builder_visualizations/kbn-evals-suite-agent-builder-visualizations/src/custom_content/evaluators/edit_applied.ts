/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { BasicPrettyPrinter, Parser, Walker, type ESQLFunction } from '@elastic/esql';
import type { EsqlQueryRunner } from '../../evaluators/esql_query_runner';
import { skippedResult } from '../../evaluator_utils';
import type { CustomContentEvaluator } from '../types';
import { readColumnReferences } from './template_column_references';

export const CUSTOM_CONTENT_EDIT_APPLIED_EVALUATOR_NAME = 'Custom Content Data Edit Applied';

const simplify = (text: string): string => text.replace(/[\s`]/g, '').toLowerCase();

/**
 * The names a query gives to the measure written as `measure`, such as `avg_bytes` for
 * `avg_bytes = AVG(bytes)`. Found from the measure, not from the column names, so a column the
 * edit renamed is not mistaken for the measure it added.
 */
export const findMeasureAliases = (query: string, measure: string): string[] => {
  const { root } = Parser.parse(query);
  const assignments: ESQLFunction[] = [];
  Walker.walk(root, {
    visitFunction: (fn) => {
      if (fn.name === '=') {
        assignments.push(fn);
      }
    },
  });
  return assignments.flatMap(({ args: [alias, assigned] }) => {
    const [expression] = Array.isArray(assigned) ? assigned : [assigned];
    return !Array.isArray(alias) &&
      alias.type === 'column' &&
      !Array.isArray(expression) &&
      simplify(BasicPrettyPrinter.expression(expression)).includes(simplify(measure))
      ? [alias.name]
      : [];
  });
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

    const computed = findMeasureAliases(query, measure);
    if (computed.length === 0) {
      return {
        score: 0,
        label: 'measure-not-in-query',
        explanation: `The edited query does not compute ${measure}.`,
      };
    }
    const aliases = computed.filter((alias) => columns.includes(alias));
    if (aliases.length === 0) {
      return {
        score: 0,
        label: 'measure-not-returned',
        explanation: `The query computes ${measure} as ${computed.join(
          ', '
        )} but does not return it, for example because a KEEP drops it.`,
        metadata: { computed, columns },
      };
    }

    const read = readColumnReferences(template);
    const shown = aliases.filter((alias) => read.includes(alias));
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
