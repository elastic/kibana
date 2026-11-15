/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface ResolveCustomContentQueryParams {
  /** A query the caller supplies. It wins: a string replaces the stored query, `null` removes it. A blank string counts as not supplied. */
  suppliedQuery?: string | null;
  /** `false` means no data: the panel ends up without a query. `true` means ensure it has one. */
  hasData?: boolean;
  /** Regenerate the query from the request, seeded with the stored one so unrelated parts survive. */
  regenerate?: boolean;
  /** The panel's stored query. Absent for a new panel and for a panel without data. */
  existingQuery: string | undefined;
  isNewPanel: boolean;
  /** Generates a query. Receives the stored queries to modify, empty when there is nothing to keep. */
  generate: (existingQueries: string[]) => Promise<string>;
}

export interface ResolvedCustomContentQuery {
  /** The query the panel should end up with, `undefined` for a panel without data. */
  query: string | undefined;
  /** False when the stored query is untouched, so callers can skip sampling the schema again. */
  isChanging: boolean;
}

/**
 * Decides which ES|QL query a custom content panel ends up with, shared by every flow that creates
 * or edits one. A supplied query always wins. A new panel gets a generated query unless it is
 * declared data-free. An edit keeps the stored query unless it is replaced, removed or explicitly
 * regenerated, so a style-only edit never pays for generation or schema sampling.
 *
 * On a new panel `hasData: false` makes it static; otherwise a query is generated.
 */
export const resolveCustomContentQuery = async ({
  suppliedQuery,
  hasData,
  regenerate,
  existingQuery,
  isNewPanel,
  generate,
}: ResolveCustomContentQueryParams): Promise<ResolvedCustomContentQuery> => {
  const resolved = async (): Promise<string | undefined> => {
    if (suppliedQuery?.trim()) return suppliedQuery;
    if (suppliedQuery === null || hasData === false) return undefined;
    if (isNewPanel) return generate([]);
    if (regenerate) return generate(existingQuery ? [existingQuery] : []);
    if (existingQuery) return existingQuery;
    return hasData === true ? generate([]) : undefined;
  };

  const query = await resolved();
  return { query, isChanging: query !== existingQuery };
};
