/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { XyChartNode } from './schema';

/** Requests per host split by status class: the Lens default stacked bar. */
export const example: XyChartNode = {
  type: 'xyChart',
  title: 'Requests by host and status',
  x: { type: 'category', title: 'Host' },
  y: { title: 'Requests', format: { style: 'number', compact: true } },
  stack: 'stacked',
  series: [
    {
      label: '2xx',
      kind: 'bar',
      points: [
        { x: 'web-01', y: 1240 },
        { x: 'web-02', y: 980 },
        { x: 'api-01', y: 1510 },
      ],
    },
    {
      label: '4xx',
      kind: 'bar',
      points: [
        { x: 'web-01', y: 132 },
        { x: 'web-02', y: 210 },
        { x: 'api-01', y: 88 },
      ],
    },
    {
      label: '5xx',
      kind: 'bar',
      points: [
        { x: 'web-01', y: 18 },
        { x: 'web-02', y: 64 },
        { x: 'api-01', y: 7 },
      ],
    },
  ],
};

/** p95 latency for two services against an SLO, read in the team's time zone. */
const latency: XyChartNode = {
  type: 'xyChart',
  title: 'Checkout p95 latency',
  description: 'APM transaction duration, 95th percentile, 30-minute buckets.',
  x: {
    type: 'time',
    timeZone: 'Europe/Amsterdam',
    granularity: 'minute',
  },
  y: { title: 'Latency', format: { style: 'duration' } },
  series: [
    {
      label: 'checkout-api',
      points: [
        { x: '2026-10-14T08:00:00Z', y: 182 },
        { x: '2026-10-14T08:30:00Z', y: 196 },
        { x: '2026-10-14T09:00:00Z', y: 412 },
        { x: '2026-10-14T09:30:00Z', y: 238 },
      ],
    },
    {
      label: 'payments',
      points: [
        { x: '2026-10-14T08:00:00Z', y: 95 },
        { x: '2026-10-14T08:30:00Z', y: 101 },
        { x: '2026-10-14T09:00:00Z', y: 118 },
        { x: '2026-10-14T09:30:00Z', y: 104 },
      ],
    },
  ],
  thresholds: [{ value: 300, label: 'SLO', tone: 'warning' }],
};

/** Hourly errors where one service reports no bucket at 02:00 and the collector lost 03:00: absent versus `null`. */
const sparse: XyChartNode = {
  type: 'xyChart',
  title: 'Errors per hour',
  x: { type: 'time', granularity: 'hour' },
  y: { title: 'Errors' },
  missing: 'zero',
  series: [
    {
      label: 'ingest',
      kind: 'bar',
      points: [
        { x: '2026-10-14T00:00:00Z', y: 4 },
        { x: '2026-10-14T01:00:00Z', y: 9 },
        { x: '2026-10-14T02:00:00Z', y: 2 },
        { x: '2026-10-14T03:00:00Z', y: null },
      ],
    },
    {
      label: 'search',
      kind: 'bar',
      points: [
        { x: '2026-10-14T00:00:00Z', y: 1 },
        { x: '2026-10-14T01:00:00Z', y: 3 },
        { x: '2026-10-14T03:00:00Z', y: null },
      ],
    },
  ],
};

/** Request volume as bars against the error rate as a line on a second, percent axis. */
const dualAxis: XyChartNode = {
  type: 'xyChart',
  title: 'Traffic and error rate',
  x: { type: 'time', granularity: 'day' },
  y: { title: 'Requests', format: { style: 'number', compact: true } },
  y2: { title: 'Error rate', format: { style: 'percent' }, domain: { min: 0 } },
  series: [
    {
      label: 'Requests',
      kind: 'bar',
      points: [
        { x: '2026-10-12', y: 182_000 },
        { x: '2026-10-13', y: 204_500 },
        { x: '2026-10-14', y: 197_300 },
      ],
    },
    {
      label: 'Error rate',
      kind: 'line',
      axis: 'y2',
      points: [
        { x: '2026-10-12', y: 0.004 },
        { x: '2026-10-13', y: 0.011 },
        { x: '2026-10-14', y: 0.006 },
      ],
    },
  ],
};

/** Each log level's share of the stream over a day: a percent-stacked area. */
const shares: XyChartNode = {
  type: 'xyChart',
  title: 'Log levels over the day',
  x: { type: 'time', granularity: 'hour' },
  stack: 'percent',
  series: [
    {
      label: 'info',
      kind: 'area',
      points: [
        { x: '2026-10-14T00:00:00Z', y: 8200 },
        { x: '2026-10-14T06:00:00Z', y: 9100 },
        { x: '2026-10-14T12:00:00Z', y: 15_400 },
        { x: '2026-10-14T18:00:00Z', y: 12_800 },
      ],
    },
    {
      label: 'warn',
      kind: 'area',
      points: [
        { x: '2026-10-14T00:00:00Z', y: 310 },
        { x: '2026-10-14T06:00:00Z', y: 290 },
        { x: '2026-10-14T12:00:00Z', y: 760 },
        { x: '2026-10-14T18:00:00Z', y: 540 },
      ],
    },
    {
      label: 'error',
      kind: 'area',
      points: [
        { x: '2026-10-14T00:00:00Z', y: 42 },
        { x: '2026-10-14T06:00:00Z', y: 38 },
        { x: '2026-10-14T12:00:00Z', y: 120 },
        { x: '2026-10-14T18:00:00Z', y: 96 },
      ],
    },
  ],
};

/**
 * Two clusters each run a node called `es-01`: keys keep the bars apart while the axis prints the same
 * label, and declared categories fix an order the data alone would not.
 */
const repeatedLabels: XyChartNode = {
  type: 'xyChart',
  title: 'Heap used by node',
  orientation: 'horizontal',
  x: {
    type: 'category',
    title: 'Node',
    categories: [
      { key: 'prod/es-01', label: 'es-01' },
      { key: 'prod/es-02', label: 'es-02' },
      { key: 'staging/es-01', label: 'es-01' },
    ],
  },
  y: {
    title: 'Heap used',
    format: { style: 'percent' },
    domain: { min: 0, max: 1 },
  },
  series: [
    {
      label: 'Heap',
      kind: 'bar',
      points: [
        { x: 'staging/es-01', y: 0.41 },
        { x: 'prod/es-01', y: 0.82 },
        { x: 'prod/es-02', y: 0.67 },
      ],
    },
  ],
};

/**
 * The form an agent most often gets wrong: times as ISO 8601 with a zone rather than `Mon` or `09:00`,
 * series keyed, and a selection bound by those keys to the host's fields.
 */
const selectable: XyChartNode = {
  type: 'xyChart',
  title: 'Failed logins by source',
  x: { type: 'time', granularity: 'hour' },
  stack: 'stacked',
  series: [
    {
      key: 'sso',
      label: 'SSO',
      kind: 'bar',
      points: [
        { x: '2026-10-14T10:00:00Z', y: 12 },
        { x: '2026-10-14T11:00:00Z', y: 47 },
      ],
    },
    {
      key: 'password',
      label: 'Password',
      kind: 'bar',
      points: [
        { x: '2026-10-14T10:00:00Z', y: 31 },
        { x: '2026-10-14T11:00:00Z', y: 29 },
      ],
    },
  ],
  selection: {
    name: 'dashboard/select',
    context: { panelId: 'failed-logins' },
    on: {
      series: {
        sso: [{ field: 'event.provider', value: 'sso' }],
        password: [{ field: 'event.provider', value: 'password' }],
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

export const examples: readonly XyChartNode[] = [
  example,
  latency,
  sparse,
  dualAxis,
  shares,
  repeatedLabels,
  selectable,
];
