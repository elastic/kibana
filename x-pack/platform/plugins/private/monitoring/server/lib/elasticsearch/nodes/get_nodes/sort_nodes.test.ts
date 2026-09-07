/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { sortNodes } from './sort_nodes';

describe('sortNodes', () => {
  it('returns nodes unchanged when sort is empty', () => {
    const nodes = [{ name: 'a' }, { name: 'b' }];
    expect(sortNodes(nodes, undefined)).toEqual(nodes);
    expect(sortNodes(nodes, { field: '', direction: 'asc' })).toEqual(nodes);
  });

  it('sorts by numeric values when values are numbers', () => {
    const nodes = [
      { name: 'low', node_cpu_utilization: 10 },
      { name: 'high', node_cpu_utilization: 85 },
      { name: 'mid', node_cpu_utilization: 50 },
    ];
    expect(sortNodes(nodes, { field: 'node_cpu_utilization', direction: 'desc' })).toEqual([
      { name: 'high', node_cpu_utilization: 85 },
      { name: 'mid', node_cpu_utilization: 50 },
      { name: 'low', node_cpu_utilization: 10 },
    ]);
  });

  it('sorts by numeric order when values are numeric strings (High to Low CPU)', () => {
    const nodes = [
      { name: 'nine', node_cpu_utilization: '9' },
      { name: 'eighty', node_cpu_utilization: '80' },
      { name: 'eightyfive', node_cpu_utilization: '85' },
    ];
    const result = sortNodes(nodes, { field: 'node_cpu_utilization', direction: 'desc' });
    expect(result.map((n) => n.name)).toEqual(['eightyfive', 'eighty', 'nine']);
  });

  it('sorts string fields by string order', () => {
    const nodes = [
      { name: 'node-c', node_cpu_utilization: 1 },
      { name: 'node-a', node_cpu_utilization: 1 },
      { name: 'node-b', node_cpu_utilization: 1 },
    ];
    expect(sortNodes(nodes, { field: 'name', direction: 'asc' })).toEqual([
      { name: 'node-a', node_cpu_utilization: 1 },
      { name: 'node-b', node_cpu_utilization: 1 },
      { name: 'node-c', node_cpu_utilization: 1 },
    ]);
  });
});
