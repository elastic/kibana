/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { GaugeNode } from './schema';

const GIB = 1024 ** 3;

/** A data node's disk use against Elasticsearch's low, high, and flood-stage watermarks. */
export const example: GaugeNode = {
  type: 'gauge',
  title: 'Disk used on es-data-01',
  value: 0.87,
  format: { style: 'percent' },
  domain: { min: 0, max: 1 },
  bands: [
    { to: 0.85, tone: 'success', label: 'Below watermarks' },
    { to: 0.9, tone: 'warning', label: 'Low watermark' },
    { to: 0.95, tone: 'risk', label: 'High watermark' },
    { to: 1, tone: 'danger', label: 'Flood stage' },
  ],
};

/** The highest anomaly score in the window against ML severity, selectable as a whole. */
const anomaly: GaugeNode = {
  type: 'gauge',
  title: 'Max anomaly score',
  description: 'Machine learning job `auth-rare-user`, last 24 hours.',
  value: 63,
  domain: { min: 0, max: 100 },
  bands: [
    { to: 25, tone: 'neutral', label: 'Low' },
    { to: 50, tone: 'warning', label: 'Minor' },
    { to: 75, tone: 'risk', label: 'Major' },
    { to: 100, tone: 'danger', label: 'Critical' },
  ],
  selection: {
    name: 'dashboard/select',
    context: { panelId: 'anomaly-score' },
  },
};

/** Ingest over its daily quota: a value past `domain.max` is valid and draws clamped. */
const overQuota: GaugeNode = {
  type: 'gauge',
  title: 'Daily ingest',
  value: 590 * GIB,
  format: { style: 'bytes' },
  domain: { min: 0, max: 500 * GIB },
  bands: [
    { to: 400 * GIB, tone: 'success' },
    { to: 500 * GIB, tone: 'warning', label: 'Near quota' },
  ],
  shape: 'bar',
};

/** The bullet form: latency where lower is better, against an SLO target. */
const latency: GaugeNode = {
  type: 'gauge',
  title: 'Checkout p95 latency',
  value: 412,
  format: { style: 'duration' },
  domain: { min: 0, max: 1000 },
  target: 300,
  bands: [
    { to: 300, tone: 'success', label: 'Within SLO' },
    { to: 500, tone: 'warning', label: 'Slow' },
    { to: 1000, tone: 'danger', label: 'Breaching' },
  ],
  shape: 'bar',
};

/** No reading yet: `null`, not `0`, and nothing but the range. */
const noData: GaugeNode = {
  type: 'gauge',
  title: 'Fleet agents healthy',
  value: null,
  format: { style: 'percent' },
  domain: { min: 0, max: 1 },
};

/**
 * The form an agent most often gets wrong: a percent as a ratio, a range that does not start at zero,
 * bands as ascending `to` with a tone each (no `from`, no color), and `danger` first because low is bad.
 */
const availability: GaugeNode = {
  type: 'gauge',
  title: 'Checkout availability',
  value: 0.9971,
  format: { style: 'percent', precision: 2 },
  domain: { min: 0.99, max: 1 },
  target: 0.999,
  bands: [
    { to: 0.995, tone: 'danger', label: 'Breaching' },
    { to: 0.999, tone: 'warning', label: 'At risk' },
    { to: 1, tone: 'success', label: 'Meeting SLO' },
  ],
};

export const examples: readonly GaugeNode[] = [
  example,
  anomaly,
  overQuota,
  latency,
  noData,
  availability,
];
