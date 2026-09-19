/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const DEFAULT_MAX_PATTERNS = 10;

/** Maximum number of patterns a caller may request. */
export const MAX_PATTERNS = 100;

/**
 * Upper bounds for free-form string inputs. Intentionally generous — they are safety guards
 * against pathological payloads (unbounded-string DoS), not business constraints.
 * Mirror the values in observability_agent_builder/server/utils/schema_limits.ts; that file
 * cannot be imported here because platform cannot depend on solutions.
 */

/** Index names and index patterns (may be comma-separated). */
export const MAX_TARGET_LENGTH = 4096;

/** Natural-language query strings. Matches the Elasticsearch keyword `ignore_above` default. */
export const MAX_NL_QUERY_LENGTH = 1024;

/** KQL filter expressions, which may chain several clauses. */
export const MAX_KQL_FILTER_LENGTH = 4096;

/** Patterns passed to RERANK. Each one is an inference call, so this is the cost knob. */
export const DEFAULT_RANK_WINDOW = 500;

/** Transport timeout for the complete ES|QL categorization and rerank request. */
export const ESQL_REQUEST_TIMEOUT_MS = 30_000;

/** CATEGORIZE similarity threshold (1-100). Lower values group more aggressively into fewer patterns. */
export const CATEGORIZE_SIMILARITY_THRESHOLD = 70;

/** Standard ES|QL time-range predicate using Kibana's reserved `?_tstart` / `?_tend` params. */
export const ESQL_TIME_RANGE_FILTER = '@timestamp >= ?_tstart AND @timestamp < ?_tend';

/** Fields required by the runtime CATEGORIZE + RERANK strategy. */
export const REQUIRED_FIELDS = ['message', '@timestamp'] as const;
