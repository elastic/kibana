/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Default lower / upper bounds substituted for `?_tstart` / `?_tend` time
 * bind parameters when an evaluator executes an ES|QL query directly
 * against Elasticsearch.
 *
 * The agent-builder default agent emits ES|QL with `?_tstart` and `?_tend`
 * placeholders for the user's selected time window — in production those
 * are substituted at the API layer that calls `esClient.esql.query` with
 * a `params` argument. The evaluators in this suite run the produced
 * query directly against the cluster (no agent layer in the loop), so
 * Elasticsearch rejects the placeholder with `parsing_exception:
 * Unknown query parameter [_tstart]`. Substituting before execution
 * unblocks the query so the underlying intent can be measured.
 *
 * The window is **now-relative** and deliberately moderate rather than the
 * old 100-year span. Two reasons:
 *
 * 1. The agent emits the auto-bucket-count form
 *    `BUCKET(@timestamp, 75, ?_tstart, ?_tend)` / `TBUCKET(75, ...)`, which
 *    divides the substituted window into ~75 buckets. A 100-year window
 *    collapsed every time-series query into a single ~1.3-year bucket
 *    (1 row), which — against a fixed-interval gold — produced a spurious
 *    mismatch on executed results. A realistic window keeps bucketing
 *    meaningful.
 * 2. It brackets both fixtures: `kibana_sample_data_logs` (anchored around
 *    install time, i.e. now) and the OTel host-metrics TSDB fixture (seeded
 *    in the last few hours — see `src/fixtures`). A fixed calendar window
 *    could not cover both because the sample-data timestamps move with the
 *    install date.
 */
const DEFAULT_LOOKBACK_MS = 60 * 24 * 60 * 60 * 1000; // 60 days
const DEFAULT_LOOKAHEAD_MS = 2 * 24 * 60 * 60 * 1000; // 2 days

/**
 * Compute the default `?_tstart` / `?_tend` bounds relative to the current
 * time. Evaluated per call (not a module constant) so the window always
 * tracks `now` and never goes stale.
 */
export function getDefaultTimeBounds(now: number = Date.now()): { tstart: string; tend: string } {
  return {
    tstart: new Date(now - DEFAULT_LOOKBACK_MS).toISOString(),
    tend: new Date(now + DEFAULT_LOOKAHEAD_MS).toISOString(),
  };
}

/**
 * Pattern matching the agent's named time bind parameters. `\b` after
 * the name guards against accidentally matching longer identifiers like
 * `?_tstartfoo` — only complete `?_tstart` / `?_tend` tokens are
 * substituted.
 */
const TSTART_TOKEN = /\?_tstart\b/g;
const TEND_TOKEN = /\?_tend\b/g;

/**
 * Substitute the agent's `?_tstart` / `?_tend` time bind parameters with
 * concrete ISO timestamp literals so an ES|QL query produced by the agent
 * can be executed directly via `esClient.esql.query`.
 *
 * Idempotent: returns the input unchanged when neither token appears.
 *
 * @param query Raw ES|QL string, possibly containing `?_tstart` / `?_tend`.
 * @param overrides Optional bounds override for tests or future
 *                  per-example calibration.
 * @returns ES|QL string safe to execute against an ES cluster.
 */
export function substituteEsqlBindParams(
  query: string,
  overrides?: { tstart?: string; tend?: string }
): string {
  if (typeof query !== 'string' || query.length === 0) return query;
  const defaults = getDefaultTimeBounds();
  const tstart = overrides?.tstart ?? defaults.tstart;
  const tend = overrides?.tend ?? defaults.tend;
  return query.replace(TSTART_TOKEN, `"${tstart}"`).replace(TEND_TOKEN, `"${tend}"`);
}
