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
// Histogram buckets to request per rule (`lookback = TARGET * interval` yields TARGET buckets).
// ES `change_point` returns `indeterminable` below 22 buckets and consumes one fewer than the
// histogram emits, so 25 keeps a safe margin above that floor at every cadence.
const CHANGE_POINT_BUCKET_TARGET = 25;

export interface RuleDetectionSchedule {
  interval_minutes: number;
  bucket_interval: string;
  lookback: string;
  lookback_minutes: number;
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
    : Math.max(DEFAULT_CHANGE_POINT_LOOKBACK_MINUTES, CHANGE_POINT_BUCKET_TARGET * intervalMinutes);

  return {
    interval_minutes: intervalMinutes,
    bucket_interval: isCriticalCadence
      ? CRITICAL_CHANGE_POINT_BUCKET_INTERVAL
      : `${intervalMinutes}m`,
    lookback: `now-${lookbackMinutes}m`,
    lookback_minutes: lookbackMinutes,
  };
}
