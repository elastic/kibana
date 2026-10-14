/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HeatmapNode } from './schema';

const hours = [
  '2026-10-14T08:00:00Z',
  '2026-10-14T09:00:00Z',
  '2026-10-14T10:00:00Z',
  '2026-10-14T11:00:00Z',
];

const row = (y: string, values: readonly (number | null)[]) =>
  values.map((value, index) => ({ x: hours[index]!, y, value }));

/** Errors per host per hour: the Lens default heatmap, on the theme’s sequential ramp. */
export const example: HeatmapNode = {
  type: 'heatmap',
  title: 'Errors by host and hour',
  x: { type: 'time', granularity: 'hour' },
  y: { type: 'category', title: 'Host' },
  format: { style: 'number', compact: true },
  cells: [
    ...row('web-01', [12, 18, 240, 31]),
    ...row('web-02', [9, 14, 1830, 46]),
    ...row('api-01', [3, 2, 7, 4]),
  ],
};

/** CPU per five-minute bucket in one row, banded by status: what a strip of colored buckets reads as. */
const strip: HeatmapNode = {
  type: 'heatmap',
  title: 'CPU on es-data-03',
  x: { type: 'time', granularity: 'minute', timeZone: 'Europe/Amsterdam' },
  format: { style: 'percent' },
  colorScale: {
    type: 'bands',
    bands: [
      { to: 0.7, tone: 'success', label: 'Normal' },
      { from: 0.7, to: 0.9, tone: 'warning', label: 'High' },
      { from: 0.9, tone: 'danger', label: 'Saturated' },
    ],
  },
  cells: [
    { x: '2026-10-14T09:00:00Z', value: 0.42 },
    { x: '2026-10-14T09:05:00Z', value: 0.71 },
    { x: '2026-10-14T09:10:00Z', value: 0.93 },
    { x: '2026-10-14T09:15:00Z', value: 0.97 },
    { x: '2026-10-14T09:20:00Z', value: 0.64 },
  ],
};

/** Week-over-week change in p95 latency per service and region, either side of no change. */
const change: HeatmapNode = {
  type: 'heatmap',
  title: 'p95 latency change, week over week',
  description: 'Negative is faster than last week.',
  x: { type: 'category', title: 'Region' },
  y: { type: 'category', title: 'Service' },
  format: { style: 'percent' },
  colorScale: { type: 'diverging', midpoint: 0 },
  cells: [
    { x: 'us-east-1', y: 'checkout', value: 0.18 },
    { x: 'eu-west-1', y: 'checkout', value: -0.04 },
    { x: 'us-east-1', y: 'search', value: -0.12 },
    { x: 'eu-west-1', y: 'search', value: 0.02 },
  ],
};

/**
 * Two clusters each run a node called `es-01`: keys keep the rows apart and print after the shared label,
 * declared categories fix both orders, and a fixed domain reads disk use as a share of 0 to 1.
 */
const repeatedLabels: HeatmapNode = {
  type: 'heatmap',
  title: 'Disk used by node and tier',
  x: {
    type: 'category',
    title: 'Tier',
    categories: [{ label: 'hot' }, { label: 'warm' }, { label: 'cold' }],
  },
  y: {
    type: 'category',
    title: 'Node',
    categories: [
      { key: 'prod/es-01', label: 'es-01' },
      { key: 'prod/es-02', label: 'es-02' },
      { key: 'staging/es-01', label: 'es-01' },
    ],
  },
  format: { style: 'percent' },
  colorScale: { type: 'sequential', domain: { min: 0, max: 1 } },
  cells: [
    { x: 'hot', y: 'prod/es-01', value: 0.81 },
    { x: 'warm', y: 'prod/es-01', value: 0.44 },
    { x: 'hot', y: 'prod/es-02', value: 0.77 },
    { x: 'cold', y: 'prod/es-02', value: 0.12 },
    { x: 'hot', y: 'staging/es-01', value: 0.3 },
  ],
};

/** The collector lost 10:00 for `api-01` (`null`), and `batch-01` reported nothing before 10:00 (left out). */
const sparse: HeatmapNode = {
  type: 'heatmap',
  title: 'Events ingested by host and hour',
  x: { type: 'time', granularity: 'hour' },
  y: { type: 'category', title: 'Host' },
  format: { style: 'number', compact: true },
  cells: [
    ...row('api-01', [52_000, 61_000, null, 58_000]),
    { x: hours[2]!, y: 'batch-01', value: 210_000 },
    { x: hours[3]!, y: 'batch-01', value: 190_000 },
  ],
};

/**
 * The form an agent most often gets wrong: weekdays are categories in declared order, not times like `Mon`,
 * and one row of buckets leaves out `y` on the chart and on every cell.
 */
const weekdays: HeatmapNode = {
  type: 'heatmap',
  title: 'Failed logins by weekday',
  x: {
    type: 'category',
    title: 'Weekday',
    categories: [
      { key: 'mon', label: 'Mon' },
      { key: 'tue', label: 'Tue' },
      { key: 'wed', label: 'Wed' },
      { key: 'thu', label: 'Thu' },
      { key: 'fri', label: 'Fri' },
      { key: 'sat', label: 'Sat' },
      { key: 'sun', label: 'Sun' },
    ],
  },
  cells: [
    { x: 'sun', value: 14 },
    { x: 'mon', value: 212 },
    { x: 'tue', value: 188 },
    { x: 'wed', value: 240 },
    { x: 'thu', value: 197 },
    { x: 'fri', value: 151 },
    { x: 'sat', value: 22 },
  ],
};

/** A selection bound by ISO time keys and host keys to the host's fields, so a click filters to that host and hour. */
const selectable: HeatmapNode = {
  type: 'heatmap',
  title: 'Alerts by rule and hour',
  x: { type: 'time', granularity: 'hour' },
  y: {
    type: 'category',
    title: 'Rule',
    categories: [
      { key: 'brute-force', label: 'Brute force login' },
      { key: 'priv-esc', label: 'Privilege escalation' },
    ],
  },
  cells: [
    { x: '2026-10-14T10:00:00Z', y: 'brute-force', value: 34 },
    { x: '2026-10-14T11:00:00Z', y: 'brute-force', value: 61 },
    { x: '2026-10-14T10:00:00Z', y: 'priv-esc', value: 2 },
    { x: '2026-10-14T11:00:00Z', y: 'priv-esc', value: 0 },
  ],
  selection: {
    name: 'dashboard/select',
    context: { panelId: 'alerts-by-rule' },
    on: {
      y: {
        'brute-force': [{ field: 'kibana.alert.rule.uuid', value: 'r-101' }],
        'priv-esc': [{ field: 'kibana.alert.rule.uuid', value: 'r-207' }],
      },
      x: {
        '2026-10-14T10:00:00Z': [
          {
            field: '@timestamp',
            range: { gte: '2026-10-14T10:00:00Z', lt: '2026-10-14T11:00:00Z' },
          },
        ],
        '2026-10-14T11:00:00Z': [
          {
            field: '@timestamp',
            range: { gte: '2026-10-14T11:00:00Z', lt: '2026-10-14T12:00:00Z' },
          },
        ],
      },
    },
  },
};

export const examples: readonly HeatmapNode[] = [
  example,
  strip,
  change,
  repeatedLabels,
  sparse,
  weekdays,
  selectable,
];
