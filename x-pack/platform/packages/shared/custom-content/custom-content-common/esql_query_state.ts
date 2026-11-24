/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Kept apart from the zod schemas, like the other helpers the panel's public code imports.

/**
 * The persisted `esql_query` field for a list of queries: a copy of the list, or nothing for a
 * panel without queries, so the field is left out instead of saved as an empty array.
 */
export const toEsqlQueryState = (queries: readonly string[]): string[] | undefined =>
  queries.length > 0 ? [...queries] : undefined;
