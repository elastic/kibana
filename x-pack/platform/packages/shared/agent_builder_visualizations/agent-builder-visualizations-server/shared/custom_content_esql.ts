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
- When each item needs its own filter and is not a value of one field (funnel steps), never compute them as columns of one STATS row. Use FORK with one branch per item, each returning the same columns, and put any time filter before the FORK. For a funnel of total, delayed and cancelled flights:
FROM kibana_sample_data_flights
| FORK (STATS flights = COUNT(*) | EVAL step_no = 1, step = "Total flights") (WHERE FlightDelay == true | STATS flights = COUNT(*) | EVAL step_no = 2, step = "Delayed flights") (WHERE Cancelled == true | STATS flights = COUNT(*) | EVAL step_no = 3, step = "Cancelled flights")
| SORT step_no
| KEEP step_no, step, flights
`;

type GenerateCustomContentEsqlParams = Omit<
  Parameters<typeof generateVisualizationEsql>[0],
  'extraInstructions'
> & {
  /** What the caller suggests when no query comes back, in terms of its own parameters. */
  noQueryHint: string;
};

/**
 * Generates the ES|QL query of a custom content panel with the shared visualization generator and
 * the custom content guidance. Pass the panel's stored query as `existingQueries` on an edit so
 * the parts the request does not change are kept. Throws, with the reason and `noQueryHint`, when
 * no query is produced.
 */
export const generateCustomContentEsql = async ({
  noQueryHint,
  ...params
}: GenerateCustomContentEsqlParams): Promise<string> => {
  const { query, error } = await generateVisualizationEsql({
    ...params,
    extraInstructions: CUSTOM_CONTENT_ESQL_INSTRUCTIONS,
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
