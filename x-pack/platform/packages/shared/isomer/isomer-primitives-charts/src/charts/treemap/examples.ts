/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TreemapNode } from './schema';

/** Disk used per data tier and data stream: parents leave `value` out and take their children's sum. */
export const example: TreemapNode = {
  type: 'treemap',
  title: 'Storage by data tier',
  format: { style: 'bytes' },
  items: [
    {
      label: 'hot',
      children: [
        { label: 'logs-nginx.access-default', value: 412_316_860_416 },
        { label: 'metrics-system.cpu-default', value: 96_636_764_160 },
        { label: 'traces-apm-default', value: 214_748_364_800 },
      ],
    },
    {
      label: 'warm',
      children: [
        { label: 'logs-nginx.access-archive', value: 858_993_459_200 },
        { label: 'metrics-system.cpu-archive', value: 171_798_691_840 },
      ],
    },
    { label: 'frozen', value: 2_199_023_255_552 },
  ],
};

/** Open alerts by MITRE ATT&CK tactic and technique, where the path from the tactic down is the point: rings. */
const alertsByTactic: TreemapNode = {
  type: 'treemap',
  title: 'Open alerts by tactic',
  description: 'Detection alerts from the last 24 hours, by MITRE ATT&CK tactic and technique.',
  layout: 'rings',
  items: [
    {
      label: 'Credential Access',
      children: [
        { label: 'Brute Force', value: 182 },
        { label: 'OS Credential Dumping', value: 23 },
      ],
    },
    {
      label: 'Execution',
      children: [
        {
          label: 'Command and Scripting Interpreter',
          children: [
            { label: 'PowerShell', value: 64 },
            { label: 'Unix Shell', value: 31 },
          ],
        },
        { label: 'Scheduled Task/Job', value: 12 },
      ],
    },
    { label: 'Persistence', value: 9 },
  ],
};

/** Many flat parts where approximate share is enough: too many for a donut, no nesting needed. */
const memoryByHost: TreemapNode = {
  type: 'treemap',
  title: 'Memory used by host',
  format: { style: 'bytes' },
  items: [
    { label: 'web-01', value: 12_884_901_888 },
    { label: 'web-02', value: 11_811_160_064 },
    { label: 'web-03', value: 9_663_676_416 },
    { label: 'api-01', value: 25_769_803_776 },
    { label: 'api-02', value: 23_622_320_128 },
    { label: 'worker-01', value: 6_442_450_944 },
    { label: 'worker-02', value: 5_368_709_120 },
    { label: 'cache-01', value: 30_064_771_072 },
    { label: 'db-01', value: 51_539_607_552 },
  ],
};

/**
 * A parent may state its value when it equals its children's sum, decimals included; a part may be zero; and one
 * top-level item wrapping the rest is allowed.
 */
const statedTotals: TreemapNode = {
  type: 'treemap',
  title: 'Cloud spend by account',
  format: { style: 'currency', currency: 'USD' },
  items: [
    {
      label: 'All accounts',
      value: 1250.3,
      children: [
        {
          label: 'production',
          value: 1000.2,
          children: [
            { label: 'compute', value: 700.1 },
            { label: 'storage', value: 300.1 },
          ],
        },
        { label: 'staging', value: 250.1 },
        { label: 'sandbox', value: 0 },
      ],
    },
  ],
};

/**
 * The form an agent most often gets wrong: `es-01` names a node in two clusters, so keys tell them apart across the
 * whole tree, not just among siblings, and a selection binds predicates to each key along the path.
 */
const selectable: TreemapNode = {
  type: 'treemap',
  title: 'Shards by cluster and node',
  items: [
    {
      key: 'prod',
      label: 'prod',
      children: [
        { key: 'prod-es-01', label: 'es-01', value: 412 },
        { key: 'prod-es-02', label: 'es-02', value: 398 },
      ],
    },
    {
      key: 'staging',
      label: 'staging',
      children: [{ key: 'staging-es-01', label: 'es-01', value: 96 }],
    },
  ],
  selection: {
    name: 'dashboard/select',
    context: { panelId: 'shards' },
    on: {
      path: {
        prod: [{ field: 'orchestrator.cluster.name', value: 'prod' }],
        staging: [{ field: 'orchestrator.cluster.name', value: 'staging' }],
        'prod-es-01': [{ field: 'host.name', value: 'es-01' }],
        'prod-es-02': [{ field: 'host.name', value: 'es-02' }],
        'staging-es-01': [{ field: 'host.name', value: 'es-01' }],
      },
    },
  },
};

export const examples: readonly TreemapNode[] = [
  example,
  alertsByTactic,
  memoryByHost,
  statedTotals,
  selectable,
];
