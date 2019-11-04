/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { set } from 'lodash';
import { DatabaseAdapter } from '../../database';
import { ElasticsearchPingsAdapter } from '../elasticsearch_pings_adapter';
import { assertCloseTo } from '../../../helper';

describe('ElasticsearchPingsAdapter class', () => {
  let database: DatabaseAdapter;
  let adapter: ElasticsearchPingsAdapter;
  let serverRequest: any;
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
    database = {
      search: async (request: any, params: any) => mockEsSearchResult,
      count: async (request: any, params: any) => mockEsCountResult,
      head: async (request: any, params: any) => null,
    };
    adapter = new ElasticsearchPingsAdapter(database);
    serverRequest = {
      requestArgs: 'hello',
    };
  });

  describe('getPingHistogram', () => {
    it('returns a single bucket if array has 1', async () => {
      expect.assertions(2);
      const search = jest.fn();
      search.mockReturnValue({
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
      const pingDatabase = {
        search,
        count: jest.fn(),
        head: async (request: any, params: any) => null,
      };
      const pingAdapter = new ElasticsearchPingsAdapter(pingDatabase);
      const result = await pingAdapter.getPingHistogram(serverRequest, 'now-15m', 'now', null);
      assertCloseTo(result.interval, 36000, 100);
      result.interval = 36000;
      expect(pingDatabase.search).toHaveBeenCalledTimes(1);
      expect(result).toMatchSnapshot();
    });

    it('returns expected result for no status filter', async () => {
      expect.assertions(2);
      const search = jest.fn();

      search.mockReturnValue(standardMockResponse);

      const pingDatabase = {
        search,
        count: jest.fn(),
        head: async (request: any, params: any) => null,
      };
      const pingAdapter = new ElasticsearchPingsAdapter(pingDatabase);
      const result = await pingAdapter.getPingHistogram(serverRequest, 'now-15m', 'now', null);
      assertCloseTo(result.interval, 36000, 100);
      result.interval = 36000;

      expect(pingDatabase.search).toHaveBeenCalledTimes(1);
      expect(result).toMatchSnapshot();
    });

    it('handles status + additional user queries', async () => {
      expect.assertions(2);
      const search = jest.fn();
      search.mockReturnValue({
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
      const pingDatabase = {
        search,
        count: jest.fn(),
        head: async (request: any, params: any) => null,
      };
      const pingAdapter = new ElasticsearchPingsAdapter(pingDatabase);
      const result = await pingAdapter.getPingHistogram(
        serverRequest,
        '1234',
        '5678',
        JSON.stringify(searchFilter),
        undefined,
        'down'
      );
      assertCloseTo(result.interval, 5609564928000, 1000);
      result.interval = 5609564928000;

      expect(pingDatabase.search).toHaveBeenCalledTimes(1);
      expect(result).toMatchSnapshot();
    });

    it('handles simple_text_query without issues', async () => {
      expect.assertions(2);
      const search = jest.fn();
      search.mockReturnValue({
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
      const searchFilter = `{"bool":{"must":[{"simple_query_string":{"query":"http"}}]}}`;
      const pingDatabase = {
        search,
        count: jest.fn(),
        head: async (request: any, params: any) => null,
      };
      const pingAdapter = new ElasticsearchPingsAdapter(pingDatabase);
      const result = await pingAdapter.getPingHistogram(
        serverRequest,
        'now-15m',
        'now',
        searchFilter
      );

      assertCloseTo(result.interval, 36000, 100);
      result.interval = 36000;
      expect(pingDatabase.search).toHaveBeenCalledTimes(1);
      expect(result).toMatchSnapshot();
    });

    it('returns a down-filtered array for when filtered by down status', async () => {
      expect.assertions(2);
      const search = jest.fn();
      search.mockReturnValue(standardMockResponse);
      const pingDatabase = {
        search,
        count: jest.fn(),
        head: async (request: any, params: any) => null,
      };
      const pingAdapter = new ElasticsearchPingsAdapter(pingDatabase);
      const result = await pingAdapter.getPingHistogram(
        serverRequest,
        '1234',
        '5678',
        '',
        undefined,
        'down'
      );
      assertCloseTo(result.interval, 5609564928000, 1000);
      result.interval = 5609564928000;

      expect(pingDatabase.search).toHaveBeenCalledTimes(1);
      expect(result).toMatchSnapshot();
    });

    it('returns a down-filtered array for when filtered by up status', async () => {
      expect.assertions(2);
      const search = jest.fn();

      search.mockReturnValue(standardMockResponse);

      const pingDatabase = {
        search,
        count: jest.fn(),
        head: async (request: any, params: any) => null,
      };
      const pingAdapter = new ElasticsearchPingsAdapter(pingDatabase);
      const result = await pingAdapter.getPingHistogram(
        serverRequest,
        '1234',
        '5678',
        '',
        undefined,
        'up'
      );

      expect(pingDatabase.search).toHaveBeenCalledTimes(1);
      expect(result).toMatchSnapshot();
    });
  });

  describe('getDocCount', () => {
    it('returns data in appropriate shape', async () => {
      const { count } = await adapter.getDocCount(serverRequest);
      expect(count).toEqual(3);
    });
  });

  describe('getAll', () => {
    let getAllSearchMock: (request: any, params: any) => Promise<any>;
    let expectedGetAllParams: any;
    beforeEach(() => {
      getAllSearchMock = jest.fn(async (request: any, params: any) => mockEsSearchResult);
      expectedGetAllParams = {
        index: 'heartbeat-8*',
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
      const result = await adapter.getAll(
        serverRequest,
        'now-1h',
        'now',
        undefined,
        undefined,
        'asc',
        12
      );
      const count = 3;

      expect(result.total).toBe(count);

      const pings = result.pings!;
      expect(pings).toHaveLength(count);
      expect(pings[0].timestamp).toBe('2018-10-30T18:51:59.792Z');
      expect(pings[1].timestamp).toBe('2018-10-30T18:53:59.792Z');
      expect(pings[2].timestamp).toBe('2018-10-30T18:55:59.792Z');
    });

    it('creates appropriate sort and size parameters', async () => {
      database.search = getAllSearchMock;
      await adapter.getAll(serverRequest, 'now-1h', 'now', undefined, undefined, 'asc', 12);
      set(expectedGetAllParams, 'body.sort[0]', { '@timestamp': { order: 'asc' } });

      expect(database.search).toHaveBeenCalledTimes(1);
      expect(database.search).toHaveBeenCalledWith(serverRequest, expectedGetAllParams);
    });

    it('omits the sort param when no sort passed', async () => {
      database.search = getAllSearchMock;
      await adapter.getAll(serverRequest, 'now-1h', 'now', undefined, undefined, undefined, 12);

      expect(database.search).toHaveBeenCalledWith(serverRequest, expectedGetAllParams);
    });

    it('omits the size param when no size passed', async () => {
      database.search = getAllSearchMock;
      await adapter.getAll(serverRequest, 'now-1h', 'now', undefined, undefined, 'desc');
      delete expectedGetAllParams.body.size;
      set(expectedGetAllParams, 'body.sort[0].@timestamp.order', 'desc');

      expect(database.search).toHaveBeenCalledWith(serverRequest, expectedGetAllParams);
    });

    it('adds a filter for monitor ID', async () => {
      database.search = getAllSearchMock;
      await adapter.getAll(serverRequest, 'now-1h', 'now', 'testmonitorid');
      delete expectedGetAllParams.body.size;
      expectedGetAllParams.body.query.bool.filter.push({ term: { 'monitor.id': 'testmonitorid' } });

      expect(database.search).toHaveBeenCalledWith(serverRequest, expectedGetAllParams);
    });

    it('adds a filter for monitor status', async () => {
      database.search = getAllSearchMock;
      await adapter.getAll(serverRequest, 'now-1h', 'now', undefined, 'down');
      delete expectedGetAllParams.body.size;
      expectedGetAllParams.body.query.bool.filter.push({ term: { 'monitor.status': 'down' } });

      expect(database.search).toHaveBeenCalledWith(serverRequest, expectedGetAllParams);
    });
  });

  describe('getLatestMonitorDocs', () => {
    let getLatestSearchMock: (request: any, params: any) => Promise<any>;
    let expectedGetLatestSearchParams: any;
    beforeEach(() => {
      getLatestSearchMock = jest.fn(async (request: any, params: any) => mockEsSearchResult);
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
                  term: { 'monitor.id': 'testmonitor' },
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
                            id: 'testmonitor',
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
      database.search = getLatestSearchMock;
      const result = await adapter.getLatestMonitorDocs(
        serverRequest,
        'now-1h',
        'now',
        'testmonitor'
      );
      expect(result).toHaveLength(1);
      expect(result[0].timestamp).toBe(123456);
      expect(result[0].monitor).not.toBeFalsy();
      // @ts-ignore monitor will be defined
      expect(result[0].monitor.id).toBe('testmonitor');
      expect(database.search).toHaveBeenCalledWith(serverRequest, expectedGetLatestSearchParams);
    });
  });
});
