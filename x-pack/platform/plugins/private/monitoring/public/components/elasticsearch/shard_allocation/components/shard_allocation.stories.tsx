/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { ShardAllocation } from '../shard_allocation';
import { labels } from '../lib/labels';

export default {
  title: 'Monitoring/ShardAllocation',
  component: ShardAllocation,
};

const shardStats = {
  indices: {
    'node-1': { status: 'green' },
    'node-2': { status: 'yellow' },
    'index-logs': { status: 'green' },
    'index-metrics': { status: 'yellow' },
  },
};

const unassignedShards = [
  { index: 'index-logs', node: null, primary: true, state: 'UNASSIGNED', shard: 2, type: 'shard' },
  { index: 'index-logs', node: null, primary: false, state: 'UNASSIGNED', shard: 3, type: 'shard' },
];

const nodeChildren = [
  {
    id: 'node-1',
    name: 'es-node-01',
    type: 'node',
    node_type: 'master',
    children: [
      {
        index: 'index-logs',
        node: 'node-1',
        primary: true,
        state: 'STARTED',
        shard: 0,
        type: 'shard',
      },
      {
        index: 'index-logs',
        node: 'node-1',
        primary: false,
        state: 'STARTED',
        shard: 1,
        type: 'shard',
      },
    ],
  },
  {
    id: 'node-2',
    name: 'es-node-02',
    type: 'node',
    node_type: 'data',
    children: [
      {
        index: 'index-metrics',
        node: 'node-2',
        primary: true,
        state: 'STARTED',
        shard: 0,
        type: 'shard',
      },
      {
        index: 'index-metrics',
        node: 'node-2',
        primary: false,
        state: 'INITIALIZING',
        shard: 1,
        type: 'shard',
      },
    ],
  },
];

const indexChildren = [
  {
    id: 'index-logs',
    name: 'logs-2024.01',
    type: 'index',
    children: [
      {
        index: 'index-logs',
        node: 'node-1',
        primary: true,
        state: 'STARTED',
        shard: 0,
        type: 'shard',
      },
      {
        index: 'index-logs',
        node: 'node-1',
        primary: false,
        state: 'STARTED',
        shard: 1,
        type: 'shard',
      },
    ],
  },
  {
    id: 'index-metrics',
    name: 'metrics-2024.01',
    type: 'index',
    children: [
      {
        index: 'index-metrics',
        node: 'node-2',
        primary: true,
        state: 'STARTED',
        shard: 0,
        type: 'shard',
      },
      {
        index: 'index-metrics',
        node: 'node-2',
        primary: false,
        state: 'RELOCATING',
        shard: 1,
        type: 'shard',
        relocating_node: 'node-1',
      },
    ],
  },
];

/**
 * Temporary stories for visual sanity-checking the Bootstrap-free
 * shard allocation table. Will be removed in the Phase 3 cleanup PR.
 *
 * Uses the real label fixtures from {@link labels} to match
 * production column layouts.
 */
export const NoShardsAllocated = {
  render: () => (
    <ShardAllocation
      labels={labels.indexWithUnassigned}
      totalCount={0}
      nodesByIndices={[]}
      showSystemIndices={false}
      toggleShowSystemIndices={() => {}}
    />
  ),
};

/** Two-column layout: index detail page with unassigned shards. */
export const IndexWithUnassigned = {
  render: () => (
    <ShardAllocation
      labels={labels.indexWithUnassigned}
      totalCount={2}
      nodesByIndices={[{ unassigned: unassignedShards, children: nodeChildren }]}
      shardStats={shardStats}
      showSystemIndices={false}
      toggleShowSystemIndices={() => {}}
    />
  ),
};

/** One-column layout: node detail page showing indices on a node. */
export const NodeDetail = {
  render: () => (
    <ShardAllocation
      labels={labels.node}
      totalCount={2}
      nodesByIndices={[{ unassigned: [], children: indexChildren }]}
      shardStats={shardStats}
      showSystemIndices={false}
      toggleShowSystemIndices={() => {}}
    />
  ),
};

/** One-column layout: index detail page without unassigned shards. */
export const IndexDetail = {
  render: () => (
    <ShardAllocation
      labels={labels.index}
      totalCount={2}
      nodesByIndices={[{ unassigned: [], children: nodeChildren }]}
      shardStats={shardStats}
      showSystemIndices={false}
      toggleShowSystemIndices={() => {}}
    />
  ),
};
