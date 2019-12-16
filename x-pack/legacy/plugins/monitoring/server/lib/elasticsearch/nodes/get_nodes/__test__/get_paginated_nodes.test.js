/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { getPaginatedNodes } from '../get_paginated_nodes';

jest.mock('../get_node_ids', () => ({
  getNodeIds: () => [
    {
      name: 'one',
      uuid: 1,
    },
    {
      name: 'two',
      uuid: 2,
    },
  ],
}));

jest.mock('../../../../details/get_metrics', () => ({
  getMetrics: () => {
    return {
      foo: [
        [
          {
            groupedBy: 1,
            data: [[1, 10]],
          },
          {
            groupedBy: 2,
            data: [[1, 12]],
          },
        ],
      ],
    };
  },
}));

describe('getPaginatedNodes', () => {
  const req = {
    server: {
      config: () => ({
        get: () => 10,
      }),
    },
  };
  const esIndexPattern = '.monitoring-es-*';
  const clusterUuid = '1abc';
  const metricSet = ['foo', 'bar'];
  const pagination = { index: 0, size: 10 };
  const sort = {};
  const queryText = '';
  const clusterStats = {
    cluster_state: {
      nodes: {
        1: {},
      },
    },
  };
  const shardStats = {
    nodes: {
      1: {
        shardCount: 10,
      },
      2: {
        shardCount: 5,
      },
    },
  };

  it('should return a subset based on the pagination parameters', async () => {
    const nodes = await getPaginatedNodes(
      req,
      esIndexPattern,
      { clusterUuid },
      metricSet,
      pagination,
      sort,
      queryText,
      { clusterStats, shardStats }
    );
    expect(nodes).toEqual({
      pageOfNodes: [
        { name: 'one', uuid: 1, isOnline: true, shardCount: 10, foo: 10 },
        { name: 'two', uuid: 2, isOnline: false, shardCount: 5, foo: 12 },
      ],
      totalNodeCount: 2,
    });
  });

  it('should return a sorted subset', async () => {
    const nodes = await getPaginatedNodes(
      req,
      esIndexPattern,
      { clusterUuid },
      metricSet,
      pagination,
      { ...sort, field: 'foo', direction: 'desc' },
      queryText,
      { clusterStats, shardStats }
    );
    expect(nodes).toEqual({
      pageOfNodes: [
        { name: 'two', uuid: 2, isOnline: false, shardCount: 5, foo: 12 },
        { name: 'one', uuid: 1, isOnline: true, shardCount: 10, foo: 10 },
      ],
      totalNodeCount: 2,
    });
  });

  it('should return a filterd subset', async () => {
    const nodes = await getPaginatedNodes(
      req,
      esIndexPattern,
      { clusterUuid },
      metricSet,
      pagination,
      sort,
      'tw',
      { clusterStats, shardStats }
    );
    expect(nodes).toEqual({
      pageOfNodes: [{ name: 'two', uuid: 2, isOnline: false, shardCount: 5, foo: 12 }],
      totalNodeCount: 1,
    });
  });
});
