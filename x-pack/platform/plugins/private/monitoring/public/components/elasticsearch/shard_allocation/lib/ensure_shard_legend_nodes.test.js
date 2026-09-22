/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ensureShardLegendNodes } from './ensure_shard_legend_nodes';
import { indicesByNodes } from '../transformers/indices_by_nodes';

describe('ensureShardLegendNodes', () => {
  it('returns empty object when response has no shards', () => {
    expect(ensureShardLegendNodes({})).toEqual({});
    expect(ensureShardLegendNodes({ shards: [] })).toEqual({});
    expect(ensureShardLegendNodes({ nodes: {} })).toEqual({});
  });

  it('coerces nodes array to object and adds fallback entries from shards', () => {
    const response = {
      shards: [
        { index: 'idx1', node: 'nodeA', primary: true, shard: 0, state: 'STARTED' },
        { index: 'idx1', node: 'nodeB', primary: false, shard: 0, state: 'STARTED' },
      ],
      nodes: [], // API can return [] when aggregation has no buckets
    };
    const result = ensureShardLegendNodes(response);
    expect(result).toEqual({
      nodeA: { name: 'nodeA', type: 'node', node_ids: ['nodeA'] },
      nodeB: { name: 'nodeB', type: 'node', node_ids: ['nodeB'] },
    });
  });

  it('preserves existing node info and only fills missing nodes from shards', () => {
    const response = {
      shards: [
        { index: 'idx1', node: 'nodeA', primary: true, shard: 0, state: 'STARTED' },
        { index: 'idx1', node: 'nodeB', primary: false, shard: 0, state: 'STARTED' },
      ],
      nodes: {
        nodeA: { name: 'instance-0000000483', type: 'master', node_ids: ['nodeA'] },
      },
    };
    const result = ensureShardLegendNodes(response);
    expect(result.nodeA).toEqual({
      name: 'instance-0000000483',
      type: 'master',
      node_ids: ['nodeA'],
    });
    expect(result.nodeB).toEqual({
      name: 'nodeB',
      type: 'node',
      node_ids: ['nodeB'],
    });
  });

  it('handles null/undefined response', () => {
    expect(ensureShardLegendNodes(null)).toEqual({});
    expect(ensureShardLegendNodes(undefined)).toEqual({});
  });

  it('ignores shards with null or missing node', () => {
    const response = {
      shards: [
        { index: 'idx1', node: null, primary: false, shard: 0, state: 'UNASSIGNED' },
        { index: 'idx1', node: 'nodeA', primary: true, shard: 0, state: 'STARTED' },
      ],
      nodes: [],
    };
    const result = ensureShardLegendNodes(response);
    expect(result).toEqual({
      nodeA: { name: 'nodeA', type: 'node', node_ids: ['nodeA'] },
    });
  });

  it('enables Shard Legend to render when used with indicesByNodes (empty nodes from API)', () => {
    const response = {
      shards: [
        {
          index: '.ds-logs-rpp_aks.metric-default-2026.03.03-000577',
          node: 'RDk3hV5DQg2fsJBHhmevBw',
          primary: true,
          relocating_node: null,
          shard: 0,
          state: 'STARTED',
        },
        {
          index: '.ds-logs-rpp_aks.metric-default-2026.03.03-000577',
          node: 'bzvy9J1dQfShx9jlSTGEqg',
          primary: false,
          relocating_node: null,
          shard: 0,
          state: 'STARTED',
        },
      ],
      nodes: [],
    };
    const nodes = ensureShardLegendNodes(response);
    const transformer = indicesByNodes();
    const rows = transformer(response.shards, nodes);
    expect(rows).toHaveLength(1);
    expect(rows[0].id).toBe('.ds-logs-rpp_aks.metric-default-2026.03.03-000577');
    expect(rows[0].children).toHaveLength(2);
    const nodeNames = rows[0].children.map((n) => n.name);
    expect(nodeNames).toContain('RDk3hV5DQg2fsJBHhmevBw');
    expect(nodeNames).toContain('bzvy9J1dQfShx9jlSTGEqg');
  });
});
