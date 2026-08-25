/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { callout, statGroup, table, view } from '@kbn/adaptive-ui/builders';
import type { ViewSpec } from '@kbn/adaptive-ui';

/**
 * One composed `ViewSpec` (stat group + callout + table) used to prove that a
 * single portable payload renders across Kibana React, Slack Block Kit, and
 * markdown. Shared by the renderer, the cross-surface test, and the demo script.
 *
 * Built through the builders rather than as an object literal: the
 * distribution's `PrimitiveNode` is the base node shape, so a literal body node
 * fails excess-property checks. The builders are also the only thing that
 * type-checks a node's own fields.
 */
export const sampleViewSpec: ViewSpec = view({
  title: 'Cluster health',
  subtitle: 'Last 24 hours',
  body: [
    statGroup({
      label: 'Overview',
      stats: [
        { label: 'Uptime', value: '99.98%', tone: 'success' },
        { label: 'Errors', value: '142', tone: 'warning', delta: { label: '+12%', tone: 'risk' } },
        { label: 'p95 latency', value: '340ms', tone: 'neutral' },
      ],
    }),
    callout({
      title: 'Ingest lag detected',
      body: 'Two data nodes are behind on indexing. Consider rebalancing shards.',
      tone: 'warning',
    }),
    table({
      label: 'Top offending indices',
      columns: [
        { id: 'index', label: 'Index' },
        { id: 'docs', label: 'Docs', align: 'right' },
        { id: 'size', label: 'Size', align: 'right' },
      ],
      rows: [
        { index: 'logs-000042', docs: '12.4M', size: '18.2gb' },
        { index: 'metrics-000017', docs: '8.1M', size: '9.7gb' },
        { index: 'traces-000009', docs: '3.6M', size: '4.1gb' },
      ],
    }),
  ],
});
