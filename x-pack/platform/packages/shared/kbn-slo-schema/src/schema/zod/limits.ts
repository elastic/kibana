/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Upper bounds applied to request-facing strings and arrays (CodeQL
 * js/kibana/unbounded-string-in-schema). They must never be applied to a
 * schema that stored SLOs are read or written through (sloDefinitionSchema,
 * storedSloDefinitionSchema and everything they reach): the io-ts schemas
 * never bounded those fields, so a bound would reject SLOs stored before it
 * existed. Only server-normalized values (dates, durations) and bounds shared
 * with io-ts via ../validation_constants.ts (SLO id, projectRoutings) apply there.
 */

/** Free-form identifiers: names, field names, ids, urls. */
export const MAX_KEYWORD_LENGTH = 1024;

/** KQL query strings and filters, which can embed long generated clauses. */
export const MAX_QUERY_LENGTH = 8192;

/** Wire-form date strings; covers ISO 8601 and the verbose formats `new Date()` accepts. */
export const MAX_DATE_STRING_LENGTH = 128;

/** Wire-form duration strings such as `30d` or `1M`. */
export const MAX_DURATION_STRING_LENGTH = 16;

/** Request-facing arrays, such as remote cluster lists. */
export const MAX_ARRAY_LENGTH = 1000;
