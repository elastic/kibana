/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const DEFAULT_MAX_PATTERNS = 10;

/** The preconfigured RERANK inference endpoint available in ES 9.3+. */
export const RERANK_ENDPOINT = '.rerank-v1-elasticsearch';

/**
 * ECMA-262 maximum time value; `new Date(v).toISOString()` throws `RangeError` beyond it.
 * https://tc39.es/ecma262/#sec-time-values-and-time-range
 */
export const MAX_EPOCH_MS = 8_640_000_000_000_000;

/** Maximum number of patterns a caller may request. */
export const MAX_PATTERNS = 100;

// Upper bounds for free-form string inputs: safety guards against unbounded-string DoS, not business constraints.
// Platform cannot depend on solutions, so these cannot be imported from:
// https://github.com/elastic/kibana/blob/92a9fc6f80ad/x-pack/solutions/observability/plugins/observability_agent_builder/server/utils/schema_limits.ts#L29

/** Index names and index patterns (may be comma-separated). */
export const MAX_TARGET_LENGTH = 4096;

/** Natural-language query strings. Matches the Elasticsearch keyword `ignore_above` default. */
export const MAX_NL_QUERY_LENGTH = 1024;

/** KQL filter expressions, which may chain several clauses. */
export const MAX_KQL_FILTER_LENGTH = 4096;

/**
 * Hard cap on candidates sent to the rerank endpoint; not a frequency filter.
 * Tune with the retrieval evaluators in `kbn-evals-suite-semantic-log-search`.
 */
export const DEFAULT_RANK_WINDOW = 500;

/**
 * Maximum characters of pattern + sample text per candidate sent to the rerank endpoint.
 * The cross-encoder truncates at its own token limit, so bytes beyond this are transferred and tokenised for nothing.
 * https://github.com/elastic/kibana/blob/8c87186f8d59/x-pack/platform/plugins/shared/agent_builder/common/step_types/rerank_step.ts#L23
 */
export const MAX_RERANK_INPUT_LENGTH = 2000;

/**
 * Transport timeout for the cheap document-count probe that runs before categorization.
 * Short by design: if the cluster cannot count within 5 s, the 30 s categorization would certainly time out.
 * https://github.com/elastic/kibana/blob/e17aba0bc993/x-pack/platform/packages/shared/kbn-streams-ai/src/significant_events/identify_ki_queries.ts#L84
 */
export const PROBE_TIMEOUT_MS = 5_000;

/** Transport timeout for the ES|QL categorization passes. */
export const ESQL_REQUEST_TIMEOUT_MS = 30_000;

/**
 * Transport timeout for the inference rerank call, which is gated on ML model allocation rather
 * than query cost. A cold `.rerank-v1-elasticsearch` was measured importing its model for 21 s
 * before deployment even began, so it needs a larger budget than the ES|QL passes.
 */
export const RERANK_REQUEST_TIMEOUT_MS = 60_000;

/**
 * Noise exclusion threshold: patterns whose sampled count falls below `NOISE_FRACTION_DEFAULT × total × p` are excluded.
 * https://github.com/elastic/kibana/blob/d660eae7883a/x-pack/platform/packages/shared/kbn-ai-tools/src/utils/esql_categorize.ts#L27
 */
export const NOISE_FRACTION_DEFAULT = 0.01;

/** CATEGORIZE similarity threshold (1-100). Lower values group more aggressively into fewer patterns. */
export const CATEGORIZE_SIMILARITY_THRESHOLD = 70;

/** Standard ES|QL time-range predicate using Kibana's reserved `?_tstart` / `?_tend` params. */
export const ESQL_TIME_RANGE_FILTER = '@timestamp >= ?_tstart AND @timestamp < ?_tend';

/** Fields required by the runtime CATEGORIZE + RERANK strategy. */
export const REQUIRED_FIELDS = ['message', '@timestamp'] as const;
