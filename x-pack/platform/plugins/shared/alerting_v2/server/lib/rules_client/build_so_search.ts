/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Fields searched via the SO client's `search` / `searchFields` params
 * (simple_query_string). Only `text`-mapped fields can be listed here —
 * simple_query_string with a trailing `*` creates phrase-prefix queries,
 * which Elasticsearch rejects on keyword fields.
 *
 * `metadata.tags` and `grouping.fields` are keyword-only and therefore
 * excluded. To add keyword-field search in the future, add a `text`
 * sub-field to their mapping and reference it here.
 */
export const RULE_SEARCH_FIELDS = ['metadata.name', 'metadata.description'];

/**
 * Escapes characters that `simple_query_string` treats as operators so
 * user input is matched literally.  Operators: + | - " * ( ) ~ \
 */
const SIMPLE_QS_OPERATORS = /([+\-|"*()~\\])/g;
const escapeToken = (token: string): string => token.replace(SIMPLE_QS_OPERATORS, '\\$1');

/**
 * Builds the `search` string for the SO client's simple_query_string query.
 * Each whitespace-delimited token is escaped and suffixed with `*` for
 * prefix matching.
 */
export const buildSoSearch = (search?: string): string | undefined => {
  if (!search?.trim()) {
    return undefined;
  }

  return search
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((token) => `${escapeToken(token)}*`)
    .join(' ');
};
