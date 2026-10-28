/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const ESQL_OUTPUT_PREVIEW_ROW_LIMIT = 100;

/**
 * Caps the user's query at `ESQL_OUTPUT_PREVIEW_ROW_LIMIT` rows by appending a
 * `LIMIT` command. The clause goes on its own line so a trailing `//` comment
 * in the user's query cannot swallow it; a dangling trailing `|` is dropped. A
 * user `LIMIT` that is smaller still applies (the smaller limit wins).
 */
export const buildEsqlOutputPreviewQuery = (
  query: string,
  limit = ESQL_OUTPUT_PREVIEW_ROW_LIMIT
): string => {
  const trimmedQuery = query
    .trim()
    .replace(/\|\s*$/, '')
    .trimEnd();

  return `${trimmedQuery}\n| LIMIT ${limit}`;
};
