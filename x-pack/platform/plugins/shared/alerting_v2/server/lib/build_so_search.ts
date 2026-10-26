/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

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
