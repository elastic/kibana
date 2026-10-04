/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const DEFAULT_MAX_PATTERNS = 10;

/**
 * The RERANK inference endpoint preconfigured in ES 9.3+, and the default for
 * `xpack.logsDataAccess.semanticLogSearch.rerankInferenceId`. Runtime code reads the configured id,
 * not this constant.
 */
export const RERANK_ENDPOINT = '.rerank-v1-elasticsearch';

/**
 * Characters an inference id may contain. Allowlisted rather than denylisted because the configured
 * id is interpolated into the `_inference/rerank/<id>` request path, as `schema.ts` does for `target`.
 */
export const RERANK_INFERENCE_ID_PATTERN = /^[a-zA-Z0-9._-]+$/;

/** Upper bound on the configured inference id: a guard against unbounded strings, not a limit ES imposes. */
export const MAX_RERANK_INFERENCE_ID_LENGTH = 256;

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
 * Maximum characters of candidate text sent to the rerank endpoint, per candidate.
 * Set to where `.rerank-v1` stops reading (`max_sequence_length: 512`, `span: -1`); beyond that,
 * text is transferred and tokenised for nothing. Was 2000, on the mistaken claim that it sat below
 * that point.
 */
export const MAX_RERANK_INPUT_LENGTH = 1200;

/**
 * Lower bound on any candidate's rerank text, which `RERANK_INPUT_TOTAL_CHAR_BUDGET` yields to.
 * A large candidate set would otherwise split the budget into fragments too short to rank on, and
 * dropping candidates instead would lose the rare patterns this search exists to surface.
 */
export const MIN_RERANK_INPUT_LENGTH = 80;

/**
 * Target total characters across all candidates in one rerank call. Rerank cost is roughly 0.8 ms
 * per input character divided by the endpoint's allocation count, so this is what keeps latency
 * from scaling with how verbose the logs are. Retune against a latency target with that arithmetic;
 * measurements are in the eval suite's SETUP.md.
 *
 * It is a target, not a bound. `MIN_RERANK_INPUT_LENGTH` takes precedence, so the real worst case is
 * `DEFAULT_RANK_WINDOW × MIN_RERANK_INPUT_LENGTH` (40 000 characters, ~32 s against one allocation).
 * Bounding latency for real would mean lowering `DEFAULT_RANK_WINDOW`, which drops candidates.
 */
export const RERANK_INPUT_TOTAL_CHAR_BUDGET = 12_000;

/**
 * Maximum characters of a pattern's representative sample returned to the caller.
 * Raw log lines and stack traces run to multiple KB, so an unbounded sample would put an
 * unbounded response behind a bounded request. Larger than `MAX_RERANK_INPUT_LENGTH` on purpose:
 * the response may carry more of the line than the reranker read. It applies before the rerank text
 * is built, so it is an upper bound on that too and cannot change ranking.
 */
export const MAX_SAMPLE_LENGTH = 2000;

/**
 * Transport timeout for the cheap document-count probe that runs before categorization.
 * Short by design: if the cluster cannot count within 5 s, the 30 s categorization would certainly time out.
 * https://github.com/elastic/kibana/blob/e17aba0bc993/x-pack/platform/packages/shared/kbn-streams-ai/src/significant_events/identify_ki_queries.ts#L84
 */
export const PROBE_TIMEOUT_MS = 5_000;

/** Transport timeout for the ES|QL categorization passes. */
export const ESQL_REQUEST_TIMEOUT_MS = 30_000;

/**
 * Transport timeout for the inference rerank call. Sized for the default local endpoint, where the
 * call is gated on ML model allocation rather than query cost: a cold `.rerank-v1-elasticsearch`
 * was measured importing its model for 21 s before deployment even began, so it needs a larger
 * budget than the ES|QL passes.
 *
 * A hosted endpoint has no local deployment to wait for and needs far less, but the budget is
 * shared: `rerankInferenceId` is configurable, so it has to suit the slowest endpoint in use.
 *
 * Binding only together with `RERANK_INFERENCE_TIMEOUT`, which raises Elasticsearch's own budget to
 * match; on its own it is moot, because Elasticsearch gives up first.
 */
export const RERANK_REQUEST_TIMEOUT_MS = 60_000;

/**
 * Server-side budget for the rerank call, sent as the inference API's `timeout`.
 *
 * Elasticsearch defaults to 30 s and then answers `408 status_exception`, which the default local
 * endpoint cannot beat at `DEFAULT_RANK_WINDOW` until its ML deployment has scaled up: 500
 * candidates measured 17.8 s at six allocations and time out below roughly five. Raising the budget
 * is what lets a scaling deployment answer at all. Kept under `RERANK_REQUEST_TIMEOUT_MS` so the
 * client stays the binding limit and an overrun is reported once, not raced.
 *
 * Measurements and failure shapes: `RERANK_ENDPOINTS.md`.
 */
export const RERANK_INFERENCE_TIMEOUT = '55s';

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
