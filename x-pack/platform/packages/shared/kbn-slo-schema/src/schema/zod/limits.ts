/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Upper bounds applied to request-facing strings and arrays so that no schema
 * reachable from an HTTP request accepts unbounded input (CodeQL
 * js/kibana/unbounded-string-in-schema). Values are deliberately generous:
 * these schemas also rehydrate stored SLOs, so a bound must never reject
 * data that was legitimately written before the bound existed.
 */

/** Free-form identifiers: names, field names, index patterns, ids, urls. */
export const MAX_KEYWORD_LENGTH = 1024;

/** KQL query strings and filter values, which can embed long generated clauses. */
export const MAX_QUERY_LENGTH = 8192;

/** Wire-form date strings; covers ISO 8601 and the verbose formats `new Date()` accepts. */
export const MAX_DATE_STRING_LENGTH = 128;

/** Wire-form duration strings such as `30d` or `1M`. */
export const MAX_DURATION_STRING_LENGTH = 16;

/** Request-facing arrays: tags, filters, metrics, monitor ids. */
export const MAX_ARRAY_LENGTH = 1000;
