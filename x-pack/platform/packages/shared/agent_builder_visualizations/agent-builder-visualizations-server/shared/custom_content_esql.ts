/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { generateVisualizationEsql } from './generate_visualization_esql';

/**
 * Guidance for queries that feed a custom content template. It follows the shared visualization
 * instructions, so it states which of their chart defaults do not apply: a template loops over
 * rows, it does not draw a chart.
 */
export const CUSTOM_CONTENT_ESQL_INSTRUCTIONS = `
## Custom content panel

The query results feed an HTML template that can only loop over the returned rows. It cannot aggregate, group or sort them, so any grouping or aggregation the content needs must happen in the query itself (STATS ... BY ...).

These rules replace the chart defaults above for this panel:
- Return one row per item the panel shows (a host, a funnel step, a hop), not one wide row with a column per item.
- Use LIMIT 100 unless the user named a number (for example "top 5"), then use that number. Do NOT default to LIMIT 10, and do not truncate a board or a diagram to a few items.
- Return the rows in the order the content needs. For ordinal content such as funnel steps or stages, keep the order the user listed (for example with an EVAL column holding the step number and a SORT on it); never sort a funnel by its values. Sort by a measure only for a ranking or when the user asks.
- Group by the dimensions the content shows, including the ones the user named for each card, row or hop.
`;

/**
 * Added when the query is one of several that feed a panel. It overrides the one-row-per-item rule
 * for headline numbers, which are one row with a column per number, and keeps the query to the data
 * it was described for, since the panel's other queries cover the rest.
 */
export const CUSTOM_CONTENT_DATASET_INSTRUCTIONS = `
## One of several queries

This query is one of several that feed the same panel, and the template reads each by its own name. It returns ONLY the data it was described for: the panel's other queries cover the rest, so do not widen it to include them.

These rules replace the one-row-per-item rule above where they apply:
- When the description is a set of headline numbers (totals, a rate, a count of errors), return ONE row with one column per number.
- Name every column after what it holds, in short snake_case: the template refers to each column by its exact name.
- For anything else, follow the rules above.
`;

type GenerateCustomContentEsqlParams = Omit<
  Parameters<typeof generateVisualizationEsql>[0],
  'extraInstructions'
> & {
  /** What the caller suggests when no query comes back, in terms of its own parameters. */
  noQueryHint: string;
  /** True when the query is one of several that feed the panel, not its only one. */
  isDataset?: boolean;
};

/**
 * Generates the ES|QL query of a custom content panel with the shared visualization generator and
 * the custom content guidance. Pass the panel's stored query as `existingQueries` on an edit so
 * the parts the request does not change are kept. Throws, with the reason and `noQueryHint`, when
 * no query is produced.
 */
export const generateCustomContentEsql = async ({
  noQueryHint,
  isDataset = false,
  ...params
}: GenerateCustomContentEsqlParams): Promise<string> => {
  const { query, error } = await generateVisualizationEsql({
    ...params,
    extraInstructions: isDataset
      ? `${CUSTOM_CONTENT_ESQL_INSTRUCTIONS}${CUSTOM_CONTENT_DATASET_INSTRUCTIONS}`
      : CUSTOM_CONTENT_ESQL_INSTRUCTIONS,
  });
  if (!query) {
    throw new Error(
      `Could not generate an ES|QL query for this panel: ${
        error ?? 'no query was produced'
      }. ${noQueryHint}`
    );
  }
  return query;
};
