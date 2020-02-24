/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { set } from 'lodash';
import { elasticsearchPingsAdapter as adapter } from '../es_pings';

describe('ElasticsearchPingsAdapter class', () => {
  let mockHits: any[];
  let mockEsSearchResult: any;
  let mockEsCountResult: any;
  const standardMockResponse: any = {
    aggregations: {
      timeseries: {
        buckets: [
          {
            key: 1,
            up: {
              doc_count: 2,
            },
            down: {
              doc_count: 1,
            },
          },
          {
            key: 2,
            up: {
              doc_count: 2,
            },
            down: {
              bucket_count: 1,
            },
          },
        ],
        interval: '1s',
      },
    },
  };

  beforeEach(() => {
    mockHits = [
      {
        _source: {
          '@timestamp': '2018-10-30T18:51:59.792Z',
        },
      },
      {
        _source: {
          '@timestamp': '2018-10-30T18:53:59.792Z',
        },
      },
      {
        _source: {
          '@timestamp': '2018-10-30T18:55:59.792Z',
        },
      },
    ];
    mockEsSearchResult = {
      hits: {
        total: {
          value: mockHits.length,
        },
        hits: mockHits,
      },
      aggregations: {
        locations: {
          buckets: [{ key: 'foo' }],
        },
      },
    };
    mockEsCountResult = {
      count: mockHits.length,
    };
  });

  describe('getPingHistogram', () => {
    it('returns a single bucket if array has 1', async () => {
      expect.assertions(2);
      const mockEsClient = jest.fn();
      mockEsClient.mockReturnValue({
        aggregations: {
          timeseries: {
            buckets: [
              {
                key: 1,
                up: {
                  doc_count: 2,
                },
                down: {
                  doc_count: 1,
                },
              },
            ],
          },
        },
      });
      const result = await adapter.getPingHistogram({
        callES: mockEsClient,
        dateStart: 'now-15m',
        dateEnd: 'now',
        filters: '',
      });
      result.interval = '10s';
      expect(mockEsClient).toHaveBeenCalledTimes(1);
      expect(result).toMatchSnapshot();
    });

    it('returns expected result for no status filter', async () => {
      expect.assertions(2);
      const mockEsClient = jest.fn();

      mockEsClient.mockReturnValue(standardMockResponse);

      const result = await adapter.getPingHistogram({
        callES: mockEsClient,
        dateStart: 'now-15m',
        dateEnd: 'now',
        filters: '',
      });
      result.interval = '1m';

      expect(mockEsClient).toHaveBeenCalledTimes(1);
      expect(result).toMatchSnapshot();
    });

    it('handles status + additional user queries', async () => {
      expect.assertions(2);
      const mockEsClient = jest.fn();
      mockEsClient.mockReturnValue({
        aggregations: {
          timeseries: {
            buckets: [
              {
                key: 1,
                up: {
                  doc_count: 2,
                },
                down: {
                  doc_count: 1,
                },
              },
              {
                key: 2,
                up: {
                  doc_count: 2,
                },
                down: {
                  doc_count: 2,
                },
              },
              {
                key: 3,
                up: {
                  doc_count: 3,
                },
                down: {
                  doc_count: 1,
                },
              },
            ],
          },
        },
      });
      const searchFilter = {
        bool: {
          must: [
            { match: { 'monitor.id': { query: 'auto-http-0X89BB0F9A6C81D178', operator: 'and' } } },
            { match: { 'monitor.name': { query: 'my-new-test-site-name', operator: 'and' } } },
          ],
        },
      };
      const result = await adapter.getPingHistogram({
        callES: mockEsClient,
        dateStart: '1234',
        dateEnd: '5678',
        filters: JSON.stringify(searchFilter),
        monitorId: undefined,
        statusFilter: 'down',
      });
      result.interval = '1h';

      expect(mockEsClient).toHaveBeenCalledTimes(1);
      expect(result).toMatchSnapshot();
    });

    it('handles simple_text_query without issues', async () => {
      expect.assertions(2);
      const mockEsClient = jest.fn();
      mockEsClient.mockReturnValue({
        aggregations: {
          timeseries: {
            buckets: [
              {
                key: 1,
                up: {
                  doc_count: 2,
                },
                down: {
                  doc_count: 1,
                },
              },
              {
                key: 2,
                up: {
                  doc_count: 1,
                },
                down: {
                  doc_count: 2,
                },
              },
              {
                key: 3,
                up: {
                  doc_count: 3,
                },
                down: {
                  doc_count: 1,
                },
              },
            ],
          },
        },
      });
      const filters = `{"bool":{"must":[{"simple_query_string":{"query":"http"}}]}}`;
      const result = await adapter.getPingHistogram({
        callES: mockEsClient,
        dateStart: 'now-15m',
        dateEnd: 'now',
        filters,
      });

      result.interval = '1m';
      expect(mockEsClient).toHaveBeenCalledTimes(1);
      expect(result).toMatchSnapshot();
    });

    it('returns a down-filtered array for when filtered by down status', async () => {
      expect.assertions(2);
      const mockEsClient = jest.fn();
      mockEsClient.mockReturnValue(standardMockResponse);
      const result = await adapter.getPingHistogram({
        callES: mockEsClient,
        dateStart: '1234',
        dateEnd: '5678',
        filters: '',
        monitorId: undefined,
        statusFilter: 'down',
      });

      result.interval = '1d';

      expect(mockEsClient).toHaveBeenCalledTimes(1);
      expect(result).toMatchSnapshot();
    });

    it('returns a down-filtered array for when filtered by up status', async () => {
      expect.assertions(2);
      const mockEsClient = jest.fn();

      mockEsClient.mockReturnValue(standardMockResponse);

      const result = await adapter.getPingHistogram({
        callES: mockEsClient,
        dateStart: '1234',
        dateEnd: '5678',
        filters: '',
        monitorId: undefined,
        statusFilter: 'up',
      });

      expect(mockEsClient).toHaveBeenCalledTimes(1);
      expect(result).toMatchSnapshot();
    });
  });

  describe('getDocCount', () => {
    it('returns data in appropriate shape', async () => {
      const mockEsClient = jest.fn();
      mockEsClient.mockReturnValue(mockEsCountResult);
      const { count } = await adapter.getDocCount({ callES: mockEsClient });
      expect(count).toEqual(3);
    });
  });

  describe('getAll', () => {
    let expectedGetAllParams: any;
    beforeEach(() => {
      expectedGetAllParams = {
        index: 'heartbeat*',
        body: {
          query: {
            bool: {
              filter: [{ range: { '@timestamp': { gte: 'now-1h', lte: 'now' } } }],
            },
          },
          aggregations: {
            locations: {
              terms: {
                field: 'observer.geo.name',
                missing: 'N/A',
                size: 1000,
              },
            },
          },
          sort: [{ '@timestamp': { order: 'desc' } }],
          size: 12,
        },
      };
    });

    it('returns data in the appropriate shape', async () => {
      const mockEsClient = jest.fn();
      mockEsClient.mockReturnValue(mockEsSearchResult);
      const result = await adapter.getAll({
        callES: mockEsClient,
        dateRangeStart: 'now-1h',
        dateRangeEnd: 'now',
        sort: 'asc',
        size: 12,
      });
      const count = 3;

      expect(result.total).toBe(count);

      const pings = result.pings!;
      expect(pings).toHaveLength(count);
      expect(pings[0].timestamp).toBe('2018-10-30T18:51:59.792Z');
      expect(pings[1].timestamp).toBe('2018-10-30T18:53:59.792Z');
      expect(pings[2].timestamp).toBe('2018-10-30T18:55:59.792Z');
      expect(mockEsClient).toHaveBeenCalledTimes(1);
    });

    it('creates appropriate sort and size parameters', async () => {
      const mockEsClient = jest.fn();
      mockEsClient.mockReturnValue(mockEsSearchResult);
      await adapter.getAll({
        callES: mockEsClient,
        dateRangeStart: 'now-1h',
        dateRangeEnd: 'now',
        sort: 'asc',
        size: 12,
      });
      set(expectedGetAllParams, 'body.sort[0]', { '@timestamp': { order: 'asc' } });

      expect(mockEsClient).toHaveBeenCalledTimes(1);
      expect(mockEsClient).toHaveBeenCalledWith('search', expectedGetAllParams);
    });

    it('omits the sort param when no sort passed', async () => {
      const mockEsClient = jest.fn();
      mockEsClient.mockReturnValue(mockEsSearchResult);
      await adapter.getAll({
        callES: mockEsClient,
        dateRangeStart: 'now-1h',
        dateRangeEnd: 'now',
        size: 12,
      });

      expect(mockEsClient).toHaveBeenCalledWith('search', expectedGetAllParams);
    });

    it('omits the size param when no size passed', async () => {
      const mockEsClient = jest.fn();
      mockEsClient.mockReturnValue(mockEsSearchResult);
      await adapter.getAll({
        callES: mockEsClient,
        dateRangeStart: 'now-1h',
        dateRangeEnd: 'now',
        sort: 'desc',
      });
      delete expectedGetAllParams.body.size;
      set(expectedGetAllParams, 'body.sort[0].@timestamp.order', 'desc');

      expect(mockEsClient).toHaveBeenCalledWith('search', expectedGetAllParams);
    });

    it('adds a filter for monitor ID', async () => {
      const mockEsClient = jest.fn();
      mockEsClient.mockReturnValue(mockEsSearchResult);
      await adapter.getAll({
        callES: mockEsClient,
        dateRangeStart: 'now-1h',
        dateRangeEnd: 'now',
        monitorId: 'testmonitorid',
      });
      delete expectedGetAllParams.body.size;
      expectedGetAllParams.body.query.bool.filter.push({ term: { 'monitor.id': 'testmonitorid' } });

      expect(mockEsClient).toHaveBeenCalledWith('search', expectedGetAllParams);
    });

    it('adds a filter for monitor status', async () => {
      const mockEsClient = jest.fn();
      mockEsClient.mockReturnValue(mockEsSearchResult);
      await adapter.getAll({
        callES: mockEsClient,
        dateRangeStart: 'now-1h',
        dateRangeEnd: 'now',
        status: 'down',
      });
      delete expectedGetAllParams.body.size;
      expectedGetAllParams.body.query.bool.filter.push({ term: { 'monitor.status': 'down' } });

      expect(mockEsClient).toHaveBeenCalledWith('search', expectedGetAllParams);
    });
  });

  describe('getLatestMonitorStatus', () => {
    let expectedGetLatestSearchParams: any;
    beforeEach(() => {
      expectedGetLatestSearchParams = {
        index: 'heartbeat*',
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
      const result = await adapter.getLatestMonitorStatus({
        callES: mockEsClient,
        dateStart: 'now-1h',
        dateEnd: 'now',
        monitorId: 'testMonitor',
      });
      expect(result.timestamp).toBe(123456);
      expect(result.monitor).not.toBeFalsy();
      // @ts-ignore monitor will be defined
      expect(result.monitor.id).toBe('testMonitor');
      expect(mockEsClient).toHaveBeenCalledWith('search', expectedGetLatestSearchParams);
    });
  });
});
