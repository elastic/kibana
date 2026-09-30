/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Now-relative window: wide enough to bracket kibana_sample_data_logs (install-time) and GCS
// snapshot replay data (timestamp-shifted to end at now). A 100-year span collapsed auto-bucket
// queries to 1 row, so moderate bounds keep bucketing meaningful. Evaluated per call so the window
// tracks `now`.
const DEFAULT_LOOKBACK_MS = 60 * 24 * 60 * 60 * 1000; // 60 days
const DEFAULT_LOOKAHEAD_MS = 2 * 24 * 60 * 60 * 1000; // 2 days
export function getDefaultTimeBounds(now: number = Date.now()): { tstart: string; tend: string } {
  return {
    tstart: new Date(now - DEFAULT_LOOKBACK_MS).toISOString(),
    tend: new Date(now + DEFAULT_LOOKAHEAD_MS).toISOString(),
  };
}

// `\b` prevents matching longer identifiers like `?_tstartfoo`.
const TSTART_TOKEN = /\?_tstart\b/g;
const TEND_TOKEN = /\?_tend\b/g;

/**
 * Replace `?_tstart` / `?_tend` with ISO timestamps so queries can be
 * executed directly via `esClient.esql.query`. Idempotent.
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
