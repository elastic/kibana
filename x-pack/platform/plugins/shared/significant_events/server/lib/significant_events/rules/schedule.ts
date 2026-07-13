/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { parseDuration } from '@kbn/alerting-plugin/common/parse_duration';
import { CRITICAL_SEVERITY_THRESHOLD, type StreamQuery } from '@kbn/significant-events-schema';

const MS_PER_MINUTE = 60 * 1000;

export const CRITICAL_RULE_INTERVAL = '1m';
export const DEFAULT_RULE_INTERVAL = '5m';
export const RULE_LOOKBACK_OVERLAP_RATIO = 2;

const CRITICAL_CHANGE_POINT_BUCKET_INTERVAL = '30s';
const DEFAULT_CHANGE_POINT_LOOKBACK_MINUTES = 30;
const DEFAULT_QUICK_RECOVERY_LOOKBACK_MINUTES = 11;
const CHANGE_POINT_BUCKET_FLOOR = 22;
const RECENT_ACTIVITY_MINUTES_FLOOR = 5;
const QUIET_STATIONARY_PEAK_ALERT_COUNT = 30;

export interface RuleDetectionSchedule {
  interval_minutes: number;
  recent_activity_minutes: number;
  bucket_interval: string;
  lookback: string;
  lookback_minutes: number;
  quick_recovery_lookback: string;
  quick_recovery_lookback_minutes: number;
  quiet_stationary_peak_min_alert_count: number;
}

export function scheduleIntervalForQuery(
  query: Pick<StreamQuery, 'severity_score'>
): typeof CRITICAL_RULE_INTERVAL | typeof DEFAULT_RULE_INTERVAL {
  return (query.severity_score ?? 0) >= CRITICAL_SEVERITY_THRESHOLD
    ? CRITICAL_RULE_INTERVAL
    : DEFAULT_RULE_INTERVAL;
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

export function getRuleLookbackMs(interval: string): number {
  return RULE_LOOKBACK_OVERLAP_RATIO * getRuleIntervalMs(interval);
}

export function getRuleLookbackInterval(interval: string): string {
  const minutes = getRuleLookbackMs(interval) / MS_PER_MINUTE;
  if (!Number.isInteger(minutes)) {
    throw new Error(`Rule lookback for interval "${interval}" must resolve to whole minutes`);
  }
  return `${minutes}m`;
}

export function getRuleDetectionSchedule(
  query: Pick<StreamQuery, 'severity_score'>
): RuleDetectionSchedule {
  const interval = scheduleIntervalForQuery(query);
  const intervalMinutes = getRuleIntervalMinutes(interval);
  const isCriticalCadence = interval === CRITICAL_RULE_INTERVAL;
  const lookbackMinutes = isCriticalCadence
    ? DEFAULT_CHANGE_POINT_LOOKBACK_MINUTES
    : Math.max(DEFAULT_CHANGE_POINT_LOOKBACK_MINUTES, CHANGE_POINT_BUCKET_FLOOR * intervalMinutes);
  const quickRecoveryLookbackMinutes = isCriticalCadence
    ? DEFAULT_QUICK_RECOVERY_LOOKBACK_MINUTES
    : CHANGE_POINT_BUCKET_FLOOR * intervalMinutes;

  return {
    interval_minutes: intervalMinutes,
    recent_activity_minutes: Math.max(
      RECENT_ACTIVITY_MINUTES_FLOOR,
      RULE_LOOKBACK_OVERLAP_RATIO * intervalMinutes
    ),
    bucket_interval: isCriticalCadence
      ? CRITICAL_CHANGE_POINT_BUCKET_INTERVAL
      : `${intervalMinutes}m`,
    lookback: `now-${lookbackMinutes}m`,
    lookback_minutes: lookbackMinutes,
    quick_recovery_lookback: `now-${quickRecoveryLookbackMinutes}m`,
    quick_recovery_lookback_minutes: quickRecoveryLookbackMinutes,
    quiet_stationary_peak_min_alert_count: Math.max(
      1,
      Math.ceil(QUIET_STATIONARY_PEAK_ALERT_COUNT / intervalMinutes)
    ),
  };
}
