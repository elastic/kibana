/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Shared contract for MATCH metric-series rules written into `.rule-events.data`.
 *
 * Change {@link METRIC_SERIES_CLOSED_BUCKETS} to retune how many closed-minute
 * buckets each rule run emits; schedule.every, lookback, and LIMIT derive from it.
 *
 * Storage shape (flattened `data` leaves):
 * - `bucket`: closed-minute datetime from `BUCKET(..., 1 minute)` (ES|QL date;
 *   typically persisted as epoch millis under flattened `data`)
 * - `metric_value`: integer match count for that minute
 *
 * Readers must project via `projectMetricSeriesColumns` /
 * `METRIC_SERIES_RUNTIME_MAPPINGS` in `rule_events_metric_series.ts` — never
 * reference `data.bucket` / `data.metric_value` as ES|QL columns.
 */

export const METRIC_SERIES_BUCKET_FIELD = 'bucket';
export const METRIC_SERIES_VALUE_FIELD = 'metric_value';

/** Closed minute buckets each MATCH rule run should emit. */
export const METRIC_SERIES_CLOSED_BUCKETS = 5;

/** Source + analysis resolution (one point per closed UTC minute). */
export const METRIC_SERIES_ANALYSIS_BUCKET_INTERVAL = '1m';

/**
 * Execution cadence. Lookback is one closed minute wider than EVERY so a run
 * can fill LIMIT closed buckets after dropping the open current minute
 * (EVERY=5m → LOOKBACK=6m → 5 closed minutes). Adjacent runs overlap ~1m;
 * readers collapse duplicates with MAX(metric_value) per source minute.
 */
export const METRIC_SERIES_EVERY = `${METRIC_SERIES_CLOSED_BUCKETS}m`;
export const METRIC_SERIES_LOOKBACK = `${METRIC_SERIES_CLOSED_BUCKETS + 1}m`;
export const METRIC_SERIES_LIMIT = METRIC_SERIES_CLOSED_BUCKETS;

export const METRIC_SERIES_RULE_NAME_SUFFIX = ' (match count)';
export const METRIC_SERIES_RULE_TAG = 'sigevents:metric:match_count';

export const METRIC_SERIES_GROUPING_FIELDS = [METRIC_SERIES_BUCKET_FIELD] as const;
