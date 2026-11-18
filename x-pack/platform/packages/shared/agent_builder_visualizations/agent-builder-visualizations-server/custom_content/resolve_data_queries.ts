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
  type CustomContentQueryChanges,
} from '@kbn/custom-content-common';

export interface GenerateDataQueryParams {
  description: string;
  index?: string;
  /** The query stored at this position, to modify. */
  storedQuery?: string;
  /** How many queries the panel will have. */
  queryCount: number;
}

export interface ResolveDataQueriesParams extends CustomContentQueryChanges {
  /** The queries the panel holds now, main query first. Empty for a new panel. */
  existingQueries: readonly string[];
  /** Generates a query from a description. */
  generate: (params: GenerateDataQueryParams) => Promise<string>;
}

export interface ResolvedDataQueries {
  /** The queries the panel should end up with, main query first. */
  queries: string[];
  /** Per position: false when the stored query is untouched, so it is not sampled again. */
  changed: boolean[];
  /** Whether the queries differ from the stored ones, in value or in number. */
  hasChanges: boolean;
}

/**
 * Decides which ES|QL queries a custom content panel ends up with. `removeAllQueries` leaves none.
 * Without it and without `dataQueries` the stored queries are kept. Otherwise the caller lists the
 * queries by position: a data query with `esql` replaces the query at its position, one with
 * `description` (re)generates it, seeded with the stored query so the parts the request does not
 * change survive, and an empty one keeps it. A position past the stored queries adds a query and
 * needs one of the two. Stored queries the list does not reach are kept: removing one would shift
 * the `queries[n]` every later one is read by, and the template with it.
 */
export const resolveDataQueries = async ({
  dataQueries,
  removeAllQueries,
  existingQueries,
  generate,
}: ResolveDataQueriesParams): Promise<ResolvedDataQueries> => {
  if (removeAllQueries) {
    return { queries: [], changed: [], hasChanges: existingQueries.length > 0 };
  }
  if (!dataQueries) {
    return {
      queries: [...existingQueries],
      changed: existingQueries.map(() => false),
      hasChanges: false,
    };
  }

  const total = Math.max(dataQueries.length, existingQueries.length);
  if (total > CUSTOM_CONTENT_MAX_ESQL_QUERIES) {
    throw new Error(
      `A panel holds at most ${CUSTOM_CONTENT_MAX_ESQL_QUERIES} queries, but this request leaves it with ${total}.`
    );
  }

  // Fail before any generation is paid for when the queries the caller supplied are too long already.
  const fixedQueries = Array.from({ length: total }, (_, position) =>
    dataQueries[position]?.esql?.trim()
      ? dataQueries[position].esql ?? ''
      : existingQueries[position] ?? ''
  );
  if (!fitsEsqlQueriesTotalLength(fixedQueries)) throw new Error(ESQL_QUERIES_TOTAL_LENGTH_MESSAGE);

  const queries = await Promise.all(
    Array.from({ length: total }, async (_, position): Promise<string> => {
      const existing = existingQueries[position];
      const dataQuery = dataQueries[position];
      if (dataQuery?.esql?.trim()) return dataQuery.esql;
      if (dataQuery?.description?.trim()) {
        return generate({
          description: dataQuery.description,
          index: dataQuery.index,
          storedQuery: existing || undefined,
          queryCount: total,
        });
      }
      if (existing) return existing;
      throw new Error(
        `Data query ${
          position + 1
        } adds a new query, so it needs a \`description\` or an \`esql\` query.`
      );
    })
  );

  if (!fitsEsqlQueriesTotalLength(queries)) throw new Error(ESQL_QUERIES_TOTAL_LENGTH_MESSAGE);

  const changed = queries.map((query, position) => query !== existingQueries[position]);
  return {
    queries,
    changed,
    hasChanges: changed.some(Boolean) || queries.length !== existingQueries.length,
  };
};
