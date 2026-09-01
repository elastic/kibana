/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** Maximum length of an index pattern (e.g. `logs-*,metrics-*`). */
export const MAX_INDEX_PATTERN_LENGTH = 512;

/** Maximum length of a stat or evaluation label (an ES|QL column name). */
export const MAX_LABEL_LENGTH = 256;

/**
 * Maximum length of a user-supplied ES|QL expression fragment — the global
 * filter, a per-stat inline filter, or an evaluation expression. Well below
 * `MAX_ESQL_QUERY_LENGTH` so no combination of fragments can produce a
 * generated query that exceeds the query schema's own bound.
 */
export const MAX_EXPRESSION_LENGTH = 1024;

/** Maximum number of `STATS` aggregations in one threshold rule. */
export const MAX_STATS = 16;

/** Maximum number of `EVAL` derived metrics in one threshold rule. */
export const MAX_EVALUATIONS = 16;

/** Maximum number of conditions in the alert or recovery condition group. */
export const MAX_CONDITIONS = 16;
