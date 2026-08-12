/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Operators that Elasticsearch's regexp syntax reserves. A terms aggregation
 * `include` is a Lucene regexp, not a JavaScript one, so `< > " # @ & ~` must be
 * escaped as well or user input can produce an unparsable pattern (500) or a
 * silently wrong match.
 *
 * https://www.elastic.co/guide/en/elasticsearch/reference/current/query-dsl-regexp-query.html#_standard_operators
 */
const REGEXP_OPERATORS = /[.?+*|{}[\]()"\\#@&<>~]/g;

/** Escapes user input for literal matching inside a terms aggregation `include`. */
export const escapeTermsInclude = (query: string): string =>
  query.replace(REGEXP_OPERATORS, (match) => `\\${match}`);

/**
 * Expands one character into a case-insensitive match. A terms aggregation
 * `include` accepts no case-insensitivity flag, so each cased character becomes
 * a two-element character class. Characters whose case mappings are not a single
 * character (`ß` uppercases to `SS`) keep their literal, escaped form.
 */
const toCaseInsensitiveAtom = (character: string): string => {
  const lower = character.toLowerCase();
  const upper = character.toUpperCase();

  if (lower === upper || lower.length !== 1 || upper.length !== 1) {
    return escapeTermsInclude(character);
  }

  return `[${lower}${upper}]`;
};

/**
 * Builds the `include` pattern the tag aggregations use to filter buckets by a
 * user-typed query. The match is case-insensitive and unanchored, so `prod`
 * matches both `production` and `Non-Prod`.
 */
export const buildTermsIncludePattern = (query: string): string =>
  `.*${Array.from(query).map(toCaseInsensitiveAtom).join('')}.*`;
