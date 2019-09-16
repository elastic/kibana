/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { get, set } from 'lodash';
import { DatabaseAdapter } from '../../database';
import { ElasticsearchMonitorsAdapter } from '../elasticsearch_monitors_adapter';
import { CountParams, CountResponse } from 'elasticsearch';

const assertCloseTo = (actual: number, expected: number, precision: number) => {
  if (Math.abs(expected - actual) > precision) {
    throw new Error(`expected [${actual}] to be within ${precision} of ${actual}`);
  }
};

// FIXME: there are many untested functions in this adapter. They should be tested.
describe('ElasticsearchMonitorsAdapter', () => {
  let defaultCountResponse: CountResponse;

  beforeEach(() => {
    defaultCountResponse = {
      count: 0,
      _shards: {
        total: 0,
        successful: 0,
        failed: 0,
        skipped: 0,
      },
    };
  });

  it('will return kubernetes information if contained in hits', async () => {
    expect.assertions(2);

    const mockHits = [
      {
        _source: {
          '@timestamp': '2018-10-30T18:51:59.800Z',
          container: {
            id: 'container_id',
          },
          kubernetes: {
            pod: {
              uid: 'kubernetes_pod_uid',
            },
          },
          monitor: {
            status: 'up',
          },
        },
      },
    ];
    const mockEsQueryResult = {
      aggregations: {
        hosts: {
          buckets: [
            {
              key: {
                id: 'foo',
                url: 'bar',
              },
              latest: {
                hits: {
                  hits: mockHits,
                },
              },
              histogram: {
                buckets: [],
              },
            },
          ],
        },
      },
    };

    const database: DatabaseAdapter = {
      search: async (request: any, params: any) => mockEsQueryResult,
      count: async (request: any, params: CountParams) => defaultCountResponse,
      head: async (request: any, params: any) => null,
    };
    const adapter = new ElasticsearchMonitorsAdapter(database);
    const result = await adapter.getMonitors({}, 'now-15m', 'now');
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchSnapshot();
  });

  it('getMonitorChartsData will run expected parameters when no location is specified', async () => {
    expect.assertions(3);
    const searchMock = jest.fn();
    const search = searchMock.bind({});
    const database = {
      search,
      count: async (request: any, params: CountParams) => defaultCountResponse,
      head: async (request: any, params: any) => null,
    };
    const adapter = new ElasticsearchMonitorsAdapter(database);
    await adapter.getMonitorChartsData({}, 'fooID', 'now-15m', 'now');
    expect(searchMock).toHaveBeenCalledTimes(1);
    // protect against possible rounding errors polluting the snapshot comparison
    const fixedInterval = parseInt(
      get(
        searchMock.mock.calls[0][1],
        'body.aggs.timeseries.date_histogram.fixed_interval',
        ''
      ).split('ms')[0],
      10
    );
    expect(fixedInterval).not.toBeNaN();

    /**
     * The value based on the input should be ~36000
     */
    assertCloseTo(fixedInterval, 36000, 100);

    set(
      searchMock.mock.calls[0][1],
      'body.aggs.timeseries.date_histogram.fixed_interval',
      '36000ms'
    );
    expect(searchMock.mock.calls[0]).toMatchSnapshot();
  });

  it('getMonitorChartsData will provide expected filters when a location is specified', async () => {
    expect.assertions(3);
    const searchMock = jest.fn();
    const search = searchMock.bind({});
    const database = {
      search,
      count: async (request: any, params: CountParams) => defaultCountResponse,
      head: async (request: any, params: any) => null,
    };
    const adapter = new ElasticsearchMonitorsAdapter(database);
    await adapter.getMonitorChartsData({}, 'fooID', 'now-15m', 'now', 'Philadelphia');
    expect(searchMock).toHaveBeenCalledTimes(1);
    // protect against possible rounding errors polluting the snapshot comparison
    const fixedInterval = parseInt(
      get(
        searchMock.mock.calls[0][1],
        'body.aggs.timeseries.date_histogram.fixed_interval',
        ''
      ).split('ms')[0],
      10
    );
    expect(fixedInterval).not.toBeNaN();

    /**
     * The value based on the input should be ~36000
     */
    assertCloseTo(fixedInterval, 36000, 100);

    set(
      searchMock.mock.calls[0][1],
      'body.aggs.timeseries.date_histogram.fixed_interval',
      '36000ms'
    );
    expect(searchMock.mock.calls[0]).toMatchSnapshot();
  });
});
