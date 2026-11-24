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

/** The expressions a query groups by, so an alias (`status = response.keyword`) is read as written. */
export const readGroupings = (query: string): string[] =>
  Parser.parse(query).root.commands.flatMap(({ name, args }) =>
    STATS_COMMANDS.has(name)
      ? args.flatMap((arg) =>
          !Array.isArray(arg) && arg.type === 'option' && arg.name === 'by'
            ? arg.args.map((grouping) => BasicPrettyPrinter.print(grouping as never))
            : []
        )
      : []
  );

/** Each expected field is grouped by in one of the panel's queries, however the grouping is aliased. */
export const createQueryGroupingEvaluator = (): CustomContentEvaluator => ({
  name: CUSTOM_CONTENT_QUERY_GROUPING_EVALUATOR_NAME,
  kind: 'CODE',
  direction: 'maximize',
  evaluate: async ({ output, expected }) => {
    const fields = expected?.groupsBy;
    if (!fields?.length) {
      return skippedResult('No expected grouping declared for this example.');
    }

    const groupings = getQueries(output.after).flatMap((query) => {
      try {
        return readGroupings(query).map(normalizeQuery);
      } catch {
        return [];
      }
    });
    const missing = fields.filter(
      (field) => !groupings.some((grouping) => grouping.includes(normalizeQuery(field)))
    );

    return {
      score: (fields.length - missing.length) / fields.length,
      label: missing.length === 0 ? 'grouped-by-all' : 'missing-grouping',
      explanation:
        missing.length === 0
          ? 'Every expected field is grouped by in a query.'
          : `No query groups by: ${missing.join(', ')}.`,
      metadata: { groupings, missing },
    };
  },
});
