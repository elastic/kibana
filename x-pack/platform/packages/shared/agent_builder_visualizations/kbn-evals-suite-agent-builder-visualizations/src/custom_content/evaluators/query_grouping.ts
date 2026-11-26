/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { BasicPrettyPrinter, Parser } from '@elastic/esql';
import { skippedResult } from '../../evaluator_utils';
import { getQueries } from '../custom_content_output';
import type { CustomContentEvaluator } from '../types';
import { normalizeQuery } from './query_contents';

export const CUSTOM_CONTENT_QUERY_GROUPING_EVALUATOR_NAME = 'Custom Content Query Grouping';

const STATS_COMMANDS = new Set(['stats', 'inline stats', 'inlinestats']);

/** The expressions a query groups by, as written; a query that does not parse cleanly groups by nothing. */
export const readGroupings = (query: string): string[] => {
  const { root, errors } = Parser.parse(query);
  if (errors.length > 0) {
    return [];
  }
  return root.commands.flatMap(({ name, args }) =>
    STATS_COMMANDS.has(name)
      ? args.flatMap((arg) =>
          !Array.isArray(arg) && arg.type === 'option' && arg.name === 'by'
            ? arg.args.map((grouping) => BasicPrettyPrinter.print(grouping as never))
            : []
        )
      : []
  );
};

/** Each expected field has a query that groups by it alone among the expected fields, however the grouping is aliased. */
export const createQueryGroupingEvaluator = (): CustomContentEvaluator => ({
  name: CUSTOM_CONTENT_QUERY_GROUPING_EVALUATOR_NAME,
  kind: 'CODE',
  direction: 'maximize',
  evaluate: async ({ output, expected }) => {
    const fields = expected?.groupsBy;
    if (!fields?.length) {
      return skippedResult('No expected grouping declared for this example.');
    }

    const groupings = getQueries(output.after).map((query) => {
      try {
        return readGroupings(query).map(normalizeQuery);
      } catch {
        return [];
      }
    });
    const fieldsByQuery = groupings.map((expressions) =>
      fields.filter((field) =>
        expressions.some((expression) => expression.includes(normalizeQuery(field)))
      )
    );
    const covered = fields.filter((field) =>
      fieldsByQuery.some((grouped) => grouped.length === 1 && grouped[0] === field)
    );

    return {
      score: covered.length / fields.length,
      label: covered.length === fields.length ? 'grouped-by-all' : 'missing-grouping',
      explanation:
        covered.length === fields.length
          ? 'Each expected field has a query that groups by it alone.'
          : `No query groups by only: ${fields
              .filter((field) => !covered.includes(field))
              .join(', ')}.`,
      metadata: { groupings },
    };
  },
});
