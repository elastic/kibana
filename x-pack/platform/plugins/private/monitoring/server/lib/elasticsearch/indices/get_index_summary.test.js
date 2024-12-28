/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { handleResponse } from './get_index_summary';

// TODO: tests were not running and are not up to date
describe.skip('get_index_summary handleResponse', () => {
  it('default undefined fields in result for empty response', () => {
    const shardStats = {};
    const indexUuid = null;

    const handleFn = handleResponse(shardStats, indexUuid);
    const response = {};

    const result = handleFn(response);
    expect(result).toBe({
      dataSize: {
        primaries: undefined,
        total: undefined,
      },
      documents: undefined,
      status: 'Not Available',
    });
  });

  describe('With index_stats hits', () => {
    it('incomplete shardStats data', () => {
      const shardStats = { indices: { mycoolindex: {} } };
      const indexUuid = 'mycoolindex';

      const handleFn = handleResponse(shardStats, indexUuid);
      const result = handleFn({
        hits: {
          hits: [
            {
              _source: {
                index_stats: {
                  total: {
                    store: {
                      size_in_bytes: 250000,
                    },
                  },
                  primaries: {
                    docs: {
                      count: 250,
                    },
                    store: {
                      size_in_bytes: 122500,
                    },
                  },
                },
              },
            },
          ],
        },
      });

      expect(result).toBe({
        documents: 250,
        dataSize: {
          primaries: 122500,
          total: 250000,
        },
        status: 'Unknown',
        totalShards: 0,
        unassignedShards: 0,
      });
    });

    it('complete shardStats data', () => {
      const shardStats = {
        indices: {
          mycoolindex: {
            unassigned: {
              primary: 0,
              replica: 5,
            },
            status: 'Golden',
          },
        },
      };
      const indexUuid = 'mycoolindex';

      const handleFn = handleResponse(shardStats, indexUuid);
      const result = handleFn({
        hits: {
          hits: [
            {
              _source: {
                index_stats: {
                  total: {
                    store: {
                      size_in_bytes: 250000,
                    },
                  },
                  primaries: {
                    docs: {
                      count: 250,
                    },
                    store: {
                      size_in_bytes: 122500,
                    },
                  },
                },
              },
            },
          ],
        },
      });

      expect(result).toBe({
        documents: 250,
        dataSize: {
          primaries: 122500,
          total: 250000,
        },
        status: 'Golden',
        totalShards: 5,
        unassignedShards: 5,
      });
    });
  });
});
