/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IncidentTimelineAlert } from '../../../../common/types/api';
import type { AlertCell, AlertPoint, AlertRow, AlertRowRendering, TimeWindow } from './types';
import type { TimelineDensity } from './density';
import { TIMELINE_DENSITY } from './density';

const SECOND = 1000;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

const NICE_INTERVALS_MS = [
  SECOND,
  5 * SECOND,
  10 * SECOND,
  30 * SECOND,
  MINUTE,
  5 * MINUTE,
  10 * MINUTE,
  30 * MINUTE,
  HOUR,
  3 * HOUR,
  6 * HOUR,
  12 * HOUR,
  DAY,
  7 * DAY,
  30 * DAY,
];

export const alertTimeMs = (alert: IncidentTimelineAlert): number => Date.parse(alert.time);

/** One row per rule, ordered by the rule's first alert time. */
export const buildAlertRows = (alerts: readonly IncidentTimelineAlert[]): AlertRow[] => {
  const byRule = new Map<string, { ruleName: string; alerts: IncidentTimelineAlert[] }>();
  for (const alert of alerts) {
    const ruleId = alert.ruleId ?? alert.ruleName ?? '';
    const row = byRule.get(ruleId) ?? { ruleName: alert.ruleName ?? ruleId, alerts: [] };
    row.alerts.push(alert);
    byRule.set(ruleId, row);
  }

  return Array.from(byRule, ([ruleId, row]) => {
    const sorted = [...row.alerts].sort((a, b) => alertTimeMs(a) - alertTimeMs(b));
    return {
      ruleId,
      ruleName: row.ruleName,
      alerts: sorted,
      firstMs: sorted.length > 0 ? alertTimeMs(sorted[0]) : 0,
    };
  }).sort((a, b) => a.firstMs - b.firstMs || a.ruleName.localeCompare(b.ruleName));
};

/** The smallest round interval giving at most one bucket per `pxPerBucket` pixels. */
const getBucketIntervalMs = (
  window: TimeWindow,
  widthPx: number,
  density: TimelineDensity = TIMELINE_DENSITY
): number => {
  const buckets = Math.max(1, Math.floor(widthPx / density.pxPerBucket));
  const raw = (window.endMs - window.startMs) / buckets;
  return NICE_INTERVALS_MS.find((interval) => interval >= raw) ?? raw;
};

const byFrequency = (values: string[]): string[] => {
  const counts = new Map<string, number>();
  for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1);
  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([value]) => value);
};

const toCells = (alerts: readonly IncidentTimelineAlert[], intervalMs: number): AlertCell[] => {
  const buckets = new Map<number, IncidentTimelineAlert[]>();
  for (const alert of alerts) {
    const startMs = Math.floor(alertTimeMs(alert) / intervalMs) * intervalMs;
    const bucket = buckets.get(startMs);
    if (bucket) {
      bucket.push(alert);
    } else {
      buckets.set(startMs, [alert]);
    }
  }
  return Array.from(buckets, ([startMs, bucket]) => ({
    startMs,
    endMs: startMs + intervalMs,
    count: bucket.length,
    hostNames: byFrequency(bucket.flatMap(({ hostNames }) => hostNames)),
    userNames: byFrequency(bucket.flatMap(({ userNames }) => userNames)),
  })).sort((a, b) => a.startMs - b.startMs);
};

const toPoints = (
  alerts: readonly IncidentTimelineAlert[],
  window: TimeWindow,
  widthPx: number,
  density: TimelineDensity
): AlertPoint[] => {
  const stackMs = (density.pointStackPx * (window.endMs - window.startMs)) / Math.max(widthPx, 1);
  const points: AlertPoint[] = [];
  for (const alert of alerts) {
    const timeMs = alertTimeMs(alert);
    const previous = points[points.length - 1];
    const stack =
      previous && timeMs - previous.timeMs < stackMs
        ? (previous.stack + 1) % density.pointStackSlots
        : 0;
    points.push({ alert, timeMs, stack });
  }
  return points;
};

/**
 * Picks how one row draws in the window: count cells when any bucket holds more than
 * `cellThreshold` alerts, single points otherwise. Decided per row so a dense rule does not
 * hide sparse ones.
 */
export const renderAlertRow = (
  row: AlertRow,
  window: TimeWindow,
  widthPx: number,
  density: TimelineDensity = TIMELINE_DENSITY
): AlertRowRendering => {
  const inWindow = row.alerts.filter((alert) => {
    const timeMs = alertTimeMs(alert);
    return timeMs >= window.startMs && timeMs <= window.endMs;
  });
  const intervalMs = getBucketIntervalMs(window, widthPx, density);
  const cells = toCells(inWindow, intervalMs);

  if (cells.some(({ count }) => count > density.cellThreshold)) {
    return { kind: 'cells', cells, intervalMs };
  }
  return { kind: 'points', points: toPoints(inWindow, window, widthPx, density) };
};
