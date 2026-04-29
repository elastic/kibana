/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getIndicesUnassignedShardStats } from './get_indices_unassigned_shard_stats';

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

describe('getIndicesUnassignedShardStats', () => {
  it('should return the unassigned shard stats for indices', async () => {
    const indices = {
      12345: { status: 'red', unassigned: { primary: 1, replica: 0 } },
      6789: { status: 'yellow', unassigned: { primary: 0, replica: 1 } },
      absdf82: { status: 'green', unassigned: { primary: 0, replica: 0 } },
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
                  indices: {
                    buckets: Object.keys(indices).map((id) => ({
                      key: id,
                      state: {
                        primary: {
                          buckets:
                            indices[id].unassigned.primary || indices[id].unassigned.replica
                              ? [
                                  {
                                    key_as_string: indices[id].unassigned.primary
                                      ? 'true'
                                      : 'false',
                                    doc_count: 1,
                                  },
                                ]
                              : [],
                        },
                      },
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
    const stats = await getIndicesUnassignedShardStats(req, cluster);
    expect(stats.indices).toEqual(indices);
  });
});
