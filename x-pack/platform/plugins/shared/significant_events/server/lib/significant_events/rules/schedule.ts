/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { parseDuration } from '@kbn/alerting-plugin/common/parse_duration';
import { CRITICAL_SEVERITY_THRESHOLD, type StreamQuery } from '@kbn/significant-events-schema';
import {
  METRIC_SERIES_ANALYSIS_BUCKET_INTERVAL,
  METRIC_SERIES_EVERY,
  METRIC_SERIES_LOOKBACK,
} from './metric_series_contract';

const MS_PER_MINUTE = 60 * 1000;

/**
 * Analysis-profile markers (not rule execution intervals).
 * Critical vs default detection scan windows are selected by severity.
 * All MATCH rules execute on {@link METRIC_SERIES_EVERY} / {@link METRIC_SERIES_LOOKBACK}.
 */
export const CRITICAL_RULE_INTERVAL = '1m';
export const DEFAULT_RULE_INTERVAL = '5m';

const CRITICAL_ANALYSIS_LOOKBACK_MINUTES = 40;
const DEFAULT_ANALYSIS_LOOKBACK_MINUTES = 125;

export interface RuleDetectionSchedule {
  interval_minutes: number;
  bucket_interval: string;
  lookback: string;
  lookback_minutes: number;
}

export function isCriticalSeverity(query: Pick<StreamQuery, 'severity_score'>): boolean {
  return (query.severity_score ?? 0) >= CRITICAL_SEVERITY_THRESHOLD;
}

/**
 * Maps severity to an analysis-profile key (`1m` critical / `5m` default).
 * This is NOT the Alerting v2 rule `schedule.every` — execution always uses
 * {@link getMetricSeriesRuleSchedule}.
 */
export function scheduleIntervalForQuery(
  query: Pick<StreamQuery, 'severity_score'>
): typeof CRITICAL_RULE_INTERVAL | typeof DEFAULT_RULE_INTERVAL {
  return isCriticalSeverity(query) ? CRITICAL_RULE_INTERVAL : DEFAULT_RULE_INTERVAL;
}

/** Execution schedule for all MATCH metric-series rules. */
export function getMetricSeriesRuleSchedule(): { every: string; lookback: string } {
  return {
    every: METRIC_SERIES_EVERY,
    lookback: METRIC_SERIES_LOOKBACK,
  };
}

export function getRuleIntervalMs(interval: string): number {
  return parseDuration(interval);
}

export function getRuleIntervalMinutes(interval: string): number {
  const minutes = getRuleIntervalMs(interval) / MS_PER_MINUTE;
  if (!Number.isInteger(minutes) || minutes <= 0) {
    throw new Error(`Rule interval "${interval}" must resolve to whole positive minutes`);
  }
  return minutes;
}

/**
 * Detection change_point analysis profile by severity.
 * Bucket interval is always 1m (source metric-series resolution). A coarser
 * interval (e.g. 5m) collapses ~40 one-minute points into ~8 buckets and
 * starves change_point (< 22 values → `indeterminable`).
 */
export function getRuleDetectionSchedule(
  query: Pick<StreamQuery, 'severity_score'>
): RuleDetectionSchedule {
  if (isCriticalSeverity(query)) {
    return {
      interval_minutes: getRuleIntervalMinutes(CRITICAL_RULE_INTERVAL),
      bucket_interval: METRIC_SERIES_ANALYSIS_BUCKET_INTERVAL,
      lookback: `now-${CRITICAL_ANALYSIS_LOOKBACK_MINUTES}m`,
      lookback_minutes: CRITICAL_ANALYSIS_LOOKBACK_MINUTES,
    };
  }

  return {
    interval_minutes: getRuleIntervalMinutes(DEFAULT_RULE_INTERVAL),
    bucket_interval: METRIC_SERIES_ANALYSIS_BUCKET_INTERVAL,
    lookback: `now-${DEFAULT_ANALYSIS_LOOKBACK_MINUTES}m`,
    lookback_minutes: DEFAULT_ANALYSIS_LOOKBACK_MINUTES,
  };
}
