/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getLatestMonitor } from '../get_latest_monitor';

describe('getLatestMonitor', () => {
  let expectedGetLatestSearchParams: any;
  let mockEsSearchResult: any;
  beforeEach(() => {
    expectedGetLatestSearchParams = {
      index: 'heartbeat-8*',
      body: {
        query: {
          bool: {
            filter: [
              {
                range: {
                  '@timestamp': {
                    gte: 'now-1h',
                    lte: 'now',
                  },
                },
              },
              {
                term: { 'monitor.id': 'testMonitor' },
              },
            ],
          },
        },
        aggs: {
          by_id: {
            terms: {
              field: 'monitor.id',
              size: 1000,
            },
            aggs: {
              latest: {
                top_hits: {
                  size: 1,
                  sort: {
                    '@timestamp': { order: 'desc' },
                  },
                },
              },
            },
          },
        },
        size: 0,
      },
    };
    mockEsSearchResult = {
      aggregations: {
        by_id: {
          buckets: [
            {
              latest: {
                hits: {
                  hits: [
                    {
                      _source: {
                        '@timestamp': 123456,
                        monitor: {
                          id: 'testMonitor',
                        },
                      },
                    },
                  ],
                },
              },
            },
          ],
        },
      },
    };
  });

  it('returns data in expected shape', async () => {
    const mockEsClient = jest.fn(async (_request: any, _params: any) => mockEsSearchResult);
    const result = await getLatestMonitor({
      callES: mockEsClient,
      dateStart: 'now-1h',
      dateEnd: 'now',
      monitorId: 'testMonitor',
    });
    expect(result.timestamp).toBe(123456);
    expect(result.monitor).not.toBeFalsy();
    expect(result?.monitor?.id).toBe('testMonitor');
    expect(mockEsClient).toHaveBeenCalledWith('search', expectedGetLatestSearchParams);
  });
});
