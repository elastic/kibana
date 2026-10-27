/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MetricTrendNode } from './schema';

/** Log ingest rate against the previous hour, with the last six hours behind it. */
export const example: MetricTrendNode = {
  type: 'metricTrend',
  title: 'Log ingest rate',
  value: 48_200,
  format: { style: 'number', compact: true, unit: 'events/s' },
  previous: { value: 43_000, label: 'the previous hour' },
  trend: {
    granularity: 'hour',
    points: [
      { x: '2026-10-14T04:00:00Z', y: 39_800 },
      { x: '2026-10-14T05:00:00Z', y: 41_200 },
      { x: '2026-10-14T06:00:00Z', y: 40_100 },
      { x: '2026-10-14T07:00:00Z', y: 42_600 },
      { x: '2026-10-14T08:00:00Z', y: 43_000 },
      { x: '2026-10-14T09:00:00Z', y: 47_900 },
    ],
  },
};

/** An error rate past its SLO: the author sets the status, and a ratio's change prints in percentage points. */
const errorRate: MetricTrendNode = {
  type: 'metricTrend',
  title: 'Checkout error rate',
  description: 'Share of checkout transactions that failed, from APM.',
  value: 0.052,
  format: { style: 'percent', precision: 1 },
  previous: { value: 0.012, label: 'yesterday' },
  tone: 'danger',
};

/** A count that was zero last time, so only the absolute change prints. */
const fromZero: MetricTrendNode = {
  type: 'metricTrend',
  title: 'Critical alerts open',
  value: 3,
  previous: { value: 0, label: 'yesterday' },
  tone: 'warning',
};

/** The collector stopped reporting: no current reading, with the gap in the trend as `null`. */
const noReading: MetricTrendNode = {
  type: 'metricTrend',
  title: 'Heap used on es-01',
  value: null,
  format: { style: 'bytes' },
  previous: { value: 6_442_450_944, label: 'an hour ago' },
  trend: {
    granularity: 'minute',
    points: [
      { x: '2026-10-14T08:45:00Z', y: 6_442_450_944 },
      { x: '2026-10-14T09:00:00Z', y: 6_710_886_400 },
      { x: '2026-10-14T09:15:00Z', y: null },
      { x: '2026-10-14T09:30:00Z', y: null },
    ],
  },
};

/** No earlier reading to compare with: the trend alone gives the direction, read in the team's time zone. */
const trendOnly: MetricTrendNode = {
  type: 'metricTrend',
  title: 'Search p95 latency',
  value: 212,
  format: { style: 'duration' },
  trend: {
    timeZone: 'Europe/Amsterdam',
    granularity: 'day',
    points: [
      { x: '2026-10-10', y: 188 },
      { x: '2026-10-11', y: 194 },
      { x: '2026-10-12', y: 240 },
      { x: '2026-10-13', y: 205 },
    ],
  },
};

/** Just the number, named. */
const bare: MetricTrendNode = {
  type: 'metricTrend',
  title: 'Hosts reporting',
  value: 1_284,
};

/**
 * The form an agent most often gets wrong: the comparison as a number and a window, not a worded delta
 * such as `↑ 12% vs last week`; no `tone` inferred from direction; and a whole-chart selection with no keys.
 */
const selectable: MetricTrendNode = {
  type: 'metricTrend',
  title: 'Failed logins',
  value: 1_412,
  previous: { value: 1_260, label: 'last week' },
  trend: {
    granularity: 'day',
    points: [
      { x: '2026-10-08', y: 1_190 },
      { x: '2026-10-09', y: 1_305 },
      { x: '2026-10-10', y: 1_248 },
      { x: '2026-10-11', y: 1_377 },
      { x: '2026-10-12', y: 1_412 },
    ],
  },
  selection: {
    name: 'dashboard/open',
    context: { panelId: 'failed-logins', view: 'discover' },
  },
};

/** Unique visitors, its status set by where the count falls. */
const banded: MetricTrendNode = {
  type: 'metricTrend',
  title: 'Unique visitors',
  value: 1342,
  format: { style: 'number', compact: true },
  bands: [
    { tone: 'danger', label: 'Low' },
    { from: 1000, tone: 'warning', label: 'Typical' },
    { from: 2500, tone: 'success', label: 'High' },
  ],
};

export const examples: readonly MetricTrendNode[] = [
  example,
  errorRate,
  fromZero,
  noReading,
  trendOnly,
  bare,
  selectable,
  banded,
];
