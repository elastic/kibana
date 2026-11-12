/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  CUSTOM_CONTENT_MAX_ESQL_QUERIES,
  ESQL_QUERIES_TOTAL_LENGTH_MESSAGE,
  fitsEsqlQueriesTotalLength,
  type CustomContentDataset,
} from '@kbn/custom-content-common';

export interface ResolveDatasetsParams {
  /** The panel's queries by position: the first is `rows` in the template, the n-th is `queries[n].rows`. */
  datasets: readonly CustomContentDataset[];
  /** The queries the panel holds now, main query first. Empty for a new panel. */
  existingQueries: readonly string[];
  /** Generates a query from a description. Receives the stored query at that position to modify, when there is one. */
  generate: (
    dataset: { description: string; index?: string },
    existingQueries: string[],
    position: number
  ) => Promise<string>;
}

export interface ResolvedDatasets {
  /** The queries the panel should end up with, main query first. */
  queries: string[];
  /** Per position: false when the stored query is untouched, so it is not sampled again. */
  changed: boolean[];
}

/**
 * Decides which ES|QL queries a custom content panel ends up with when a caller lists them by
 * position. A dataset with `esql` replaces the query at its position, one with `description`
 * (re)generates it, seeded with the stored query so the parts the request does not change survive,
 * and an empty one keeps it. A position past the stored queries adds a query and needs one of the
 * two. Stored queries the list does not reach are kept: removing one would shift the `queries[n]`
 * every later one is read by, and the template with it.
 */
export const resolveDatasets = async ({
  datasets,
  existingQueries,
  generate,
}: ResolveDatasetsParams): Promise<ResolvedDatasets> => {
  const total = Math.max(datasets.length, existingQueries.length);
  if (total > CUSTOM_CONTENT_MAX_ESQL_QUERIES) {
    throw new Error(
      `A panel holds at most ${CUSTOM_CONTENT_MAX_ESQL_QUERIES} queries, but this request leaves it with ${total}.`
    );
  }

  // Fail before any generation is paid for when the queries the caller supplied are too long already.
  const verbatim = Array.from({ length: total }, (_, position) =>
    datasets[position]?.esql?.trim()
      ? datasets[position].esql ?? ''
      : existingQueries[position] ?? ''
  );
  if (!fitsEsqlQueriesTotalLength(verbatim)) throw new Error(ESQL_QUERIES_TOTAL_LENGTH_MESSAGE);

  const queries = await Promise.all(
    Array.from({ length: total }, async (_, position): Promise<string> => {
      const existing = existingQueries[position];
      const dataset = datasets[position];
      if (dataset?.esql?.trim()) return dataset.esql;
      if (dataset?.description?.trim()) {
        return generate(
          { description: dataset.description, index: dataset.index },
          existing ? [existing] : [],
          position
        );
      }
      if (existing) return existing;
      throw new Error(
        `Dataset ${
          position + 1
        } adds a new query, so it needs a \`description\` or an \`esql\` query.`
      );
    })
  );

  if (!fitsEsqlQueriesTotalLength(queries)) throw new Error(ESQL_QUERIES_TOTAL_LENGTH_MESSAGE);

  return {
    queries,
    changed: queries.map((query, position) => query !== existingQueries[position]),
  };
};
