/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Shared contract for MATCH metric-series rules written into `.rule-events.data`.
 *
 * Storage shape (flattened `data` leaves):
 * - `bucket`: closed-minute datetime from `BUCKET(..., 1 minute)` (ES|QL date;
 *   typically persisted as epoch millis under flattened `data`)
 * - `metric_value`: integer match count for that minute
 *
 * Readers must project via `projectMetricSeriesColumns` /
 * `METRIC_SERIES_RUNTIME_MAPPINGS` in `rule_events_metric_series.ts` — never
 * reference `data.bucket` / `data.metric_value` as ES|QL columns.
 *
 * ## Execution timing (jitter-tolerant overlap)
 *
 * Rules run every {@link METRIC_SERIES_EVERY} (5m). Each run emits
 * {@link METRIC_SERIES_CLOSED_BUCKETS} closed minutes after dropping the open
 * current minute, so lookback is:
 *
 *   LOOKBACK = EVERY + JITTER_TOLERANCE + 1m (open-minute drop)
 *            = 5m + 1m + 1m = 7m → 6 closed minutes emitted
 *
 * The compiled query picks its window from `DATE_TRUNC(1 minute, NOW())`, not
 * from the row count: it emits the {@link METRIC_SERIES_CLOSED_BUCKETS} minutes
 * below the open one. Every emitted minute is therefore fully inside the
 * engine's lookback, so a run never stores a partial count. `SORT DESC + LIMIT`
 * is only a safety cap on top of that.
 *
 * Why the extra minute of overlap (not just LOOKBACK = EVERY + 1m):
 *
 * - On-time run at 15:05:00 looks at source docs from 14:58:00–15:05:00 and
 *   emits 15:04 … 14:59. The previous on-time run already emitted 14:59, so
 *   that minute is intentionally duplicated.
 * - Late run at 15:05:40 (crossed into a new minute) would otherwise miss
 *   14:59 if lookback were only 6m. With 7m lookback it still covers 14:59
 *   and emits 15:04 … 14:59, consuming the intentional overlap instead of
 *   leaving a gap. Its window opens mid-14:58, and the lower bound drops that
 *   partial minute rather than recording an undercount for it.
 *
 * Adjacent runs therefore may write the same source minute twice. Every
 * reader collapses duplicates with MAX(metric_value) per rule / source minute
 * before summing into chart or change-point buckets.
 *
 * {@link METRIC_SERIES_MAX_WRITE_DELAY} is the same 7m horizon used by readers
 * that filter on write-time `@timestamp` while analyzing source `bucket`.
 */

export const METRIC_SERIES_BUCKET_FIELD = 'bucket';
export const METRIC_SERIES_VALUE_FIELD = 'metric_value';

/** Rule execution cadence (Alerting v2 `schedule.every`). */
export const METRIC_SERIES_CADENCE_MINUTES = 5;

/**
 * Schedule jitter tolerated without skipping a closed minute.
 * One minute covers a run that starts in minute N and finishes after N+1
 * has begun (DATE_TRUNC advances, shifting the emitted window).
 */
export const METRIC_SERIES_JITTER_TOLERANCE_MINUTES = 1;

/**
 * Closed minutes each MATCH rule run should emit (cadence + jitter tolerance).
 * On-time adjacent runs overlap by {@link METRIC_SERIES_JITTER_TOLERANCE_MINUTES}.
 */
export const METRIC_SERIES_CLOSED_BUCKETS =
  METRIC_SERIES_CADENCE_MINUTES + METRIC_SERIES_JITTER_TOLERANCE_MINUTES;

/** Source + analysis resolution (one point per closed UTC minute). */
export const METRIC_SERIES_ANALYSIS_BUCKET_INTERVAL = '1m';

/**
 * Execution schedule derived from the timing contract above.
 * LOOKBACK adds one more minute so DATE_TRUNC can drop the open current minute
 * and still cover {@link METRIC_SERIES_CLOSED_BUCKETS} closed ones.
 */
export const METRIC_SERIES_EVERY = `${METRIC_SERIES_CADENCE_MINUTES}m`;
export const METRIC_SERIES_LOOKBACK = `${METRIC_SERIES_CLOSED_BUCKETS + 1}m`;

/** Row cap on a run's output. The bucket bounds already select the same minutes. */
export const METRIC_SERIES_LIMIT = METRIC_SERIES_CLOSED_BUCKETS;

/**
 * Maximum delay from closed source minute → write-time `@timestamp`.
 * Equals LOOKBACK: a minute at the far edge of a run is written when that run
 * completes, up to LOOKBACK after the minute closed (plus negligible engine lag).
 * Readers that prune on `@timestamp` and analyze `bucket` must use this horizon.
 */
export const METRIC_SERIES_MAX_WRITE_DELAY = METRIC_SERIES_LOOKBACK;

export const METRIC_SERIES_RULE_NAME_SUFFIX = ' (match count)';
export const METRIC_SERIES_RULE_TAG = 'sigevents:metric:match_count';

export const METRIC_SERIES_GROUPING_FIELDS = [METRIC_SERIES_BUCKET_FIELD] as const;
