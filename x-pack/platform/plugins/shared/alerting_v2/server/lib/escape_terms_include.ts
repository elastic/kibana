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
