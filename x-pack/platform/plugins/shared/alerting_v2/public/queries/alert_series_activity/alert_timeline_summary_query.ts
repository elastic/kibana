/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { esql } from '@elastic/esql';
import { ALERT_EVENTS_DATA_STREAM } from '@kbn/alerting-v2-episodes-ui/constants';
import type { AlertTimelineSummary } from '@kbn/alerting-v2-episodes-ui/alert_timeline';

export interface GanttSummaryEsqlRow {
  episodes_started: number;
  recovered: number;
  still_open: number;
  median_duration_ms: number | null;
}

export interface BuildGanttSummaryQueryOptions {
  ruleId: string;
  gteMs: number;
  lteMs: number;
}

const toIsoUtc = (ms: number) => new Date(ms).toISOString();

/**
 * ES|QL aggregation that computes episode-level summary stats across ALL
 * series for the rule in the given time window. Returns a single row with
 * `episodes_started`, `recovered`, `still_open`, and `median_duration_ms`.
 *
 * This replaces the client-side summary re-aggregation that previously
 * iterated every raw event a second time inside `deriveGanttData`.
 */
export const buildGanttSummaryQuery = ({ ruleId, gteMs, lteMs }: BuildGanttSummaryQueryOptions) => {
  const fromIso = toIsoUtc(gteMs);
  const toIso = toIsoUtc(lteMs);

  // prettier-ignore
  return esql.from(ALERT_EVENTS_DATA_STREAM)
    .where`type == "alert"`
    .where`rule.id == ${ruleId}`
    .where`@timestamp >= ${fromIso}::DATETIME AND @timestamp <= ${toIso}::DATETIME`
    .pipe`STATS first_ts = MIN(@timestamp), last_ts = MAX(@timestamp), last_status = LAST(episode.status, @timestamp) BY episode.id`
    .pipe`EVAL duration_ms = DATE_DIFF("millisecond", first_ts, last_ts)`
    .pipe`EVAL is_recovered_int = CASE(last_status == "inactive", 1, 0)`
    .pipe`EVAL recovered_duration_ms = CASE(last_status == "inactive", duration_ms, NULL)`
    .pipe`STATS episodes_started = COUNT(*), recovered = SUM(is_recovered_int), median_duration_ms = PERCENTILE(recovered_duration_ms, 50)`
    .pipe`EVAL still_open = episodes_started - recovered`
    .keep('episodes_started', 'recovered', 'still_open', 'median_duration_ms');
};

const EMPTY_SUMMARY: AlertTimelineSummary = {
  episodesStarted: 0,
  recovered: 0,
  stillOpen: 0,
  medianDurationMs: 0,
};

export const parseGanttSummaryRow = (
  row: GanttSummaryEsqlRow | undefined
): AlertTimelineSummary => {
  if (!row) return EMPTY_SUMMARY;
  return {
    episodesStarted: row.episodes_started ?? 0,
    recovered: row.recovered ?? 0,
    stillOpen: row.still_open ?? 0,
    medianDurationMs: row.median_duration_ms ?? 0,
  };
};
