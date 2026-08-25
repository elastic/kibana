/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getNodesShardCount } from './get_nodes_shard_count';

jest.mock('../../../static_globals', () => ({
  Globals: {
    app: {
      config: {
        ui: {
          ccs: { enabled: true },
        },
      },
    },
  },
}));

describe('getNodeShardCount', () => {
  it('should return the shard count per node', async () => {
    const nodes = {
      12345: { shardCount: 10 },
      6789: { shardCount: 1 },
      absdf82: { shardCount: 20 },
    };

    const req = {
      payload: {},
      server: {
        config: { ui: { max_bucket_size: 10000 } },
        plugins: {
          elasticsearch: {
            getCluster: () => ({
              callWithRequest: () => ({
                aggregations: {
                  nodes: {
                    buckets: Object.keys(nodes).map((id) => ({
                      key: id,
                      doc_count: nodes[id].shardCount,
                    })),
                  },
                },
              }),
            }),
          },
        },
      },
    };
    const cluster = {};
    const counts = await getNodesShardCount(req, cluster);
    expect(counts.nodes).toEqual(nodes);
  });
});
