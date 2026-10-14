/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DonutNode } from './schema';

/** Cluster storage by data tier: the parts are the whole disk footprint. */
export const example: DonutNode = {
  type: 'donut',
  title: 'Storage by data tier',
  format: { style: 'bytes' },
  parts: [
    { label: 'hot', value: 4_398_046_511_104 },
    { label: 'warm', value: 9_895_604_649_984 },
    { label: 'cold', value: 21_990_232_555_520 },
    { label: 'frozen', value: 2_199_023_255_552 },
  ],
};

/** The fewest parts the schema admits. */
const twoParts: DonutNode = {
  type: 'donut',
  title: 'Agent health',
  description: 'Fleet agents by last check-in status.',
  parts: [
    { label: 'Healthy', value: 1184 },
    { label: 'Unhealthy', value: 37 },
  ],
};

/** A part with nothing in it stays in the table, at 0%, rather than being dropped. */
const zeroPart: DonutNode = {
  type: 'donut',
  title: 'Cloud spend by provider',
  description: 'Month to date.',
  format: { style: 'currency', currency: 'USD', compact: true },
  parts: [
    { label: 'AWS', value: 48_200 },
    { label: 'GCP', value: 19_750 },
    { label: 'Azure', value: 0 },
  ],
};

/** A total of zero is valid: shares print as missing and the summary says there is nothing to split. */
const nothingToSplit: DonutNode = {
  type: 'donut',
  title: 'Failed snapshots by reason',
  description: 'Last 24 hours.',
  parts: [
    { label: 'Repository unavailable', value: 0 },
    { label: 'Timeout', value: 0 },
    { label: 'Other', value: 0 },
  ],
};

/** Two clusters each hold a `logs` index: keys keep the parts apart while the legend prints the same label. */
const repeatedLabels: DonutNode = {
  type: 'donut',
  title: 'Documents by index',
  format: { style: 'number', compact: true },
  parts: [
    { key: 'prod/logs', label: 'logs', value: 182_000_000 },
    { key: 'prod/metrics', label: 'metrics', value: 96_000_000 },
    { key: 'staging/logs', label: 'logs', value: 12_000_000 },
  ],
};

/**
 * The form an agent most often gets wrong: raw counts rather than percentages, no part for the total,
 * authored order kept, and a selection bound by part keys to the host's fields.
 */
const selectable: DonutNode = {
  type: 'donut',
  title: 'Open alerts by severity',
  parts: [
    { key: 'critical', label: 'Critical', value: 12 },
    { key: 'high', label: 'High', value: 58 },
    { key: 'medium', label: 'Medium', value: 141 },
    { key: 'low', label: 'Low', value: 96 },
  ],
  selection: {
    name: 'dashboard/select',
    context: { panelId: 'alerts-by-severity' },
    on: {
      slice: {
        critical: [{ field: 'kibana.alert.severity', value: 'critical' }],
        high: [{ field: 'kibana.alert.severity', value: 'high' }],
        medium: [{ field: 'kibana.alert.severity', value: 'medium' }],
        low: [{ field: 'kibana.alert.severity', value: 'low' }],
      },
    },
  },
};

export const examples: readonly DonutNode[] = [
  example,
  twoParts,
  zeroPart,
  nothingToSplit,
  repeatedLabels,
  selectable,
];
