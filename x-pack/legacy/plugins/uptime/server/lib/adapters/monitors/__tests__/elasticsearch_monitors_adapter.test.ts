/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { get, set } from 'lodash';
import { ElasticsearchMonitorsAdapter, daw } from '../elasticsearch_monitors_adapter';
import { CountParams, CountResponse } from 'elasticsearch';
import mockChartsData from './monitor_charts_mock.json';
import { assertCloseTo } from '../../../helper';

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

  it('does stuff', () => {
    const c = daw(
      'now-15m',
      'now',
      '{"bool":{"should":[{"match":{"url.port":80}}],"minimum_should_match":1}}'
    );
    console.log(JSON.stringify(c, null, 2));
  });

  it('does stuff with an existing filters clause', () => {
    const c = daw(
      'now-15m',
      'now',
      '{"bool":{"filter":{"term":{"field":"monitor.id"}},"should":[{"match":{"url.port":80}}],"minimum_should_match":1}}'
    );
    console.log(JSON.stringify(c, null, 2));
  });

  it('does stuff when filters is an obj', () => {
    const c = daw(
      'now-15m',
      'now',
      '{"bool":{"filter":[{"field":"monitor.id"}],"should":[{"match":{"url.port":80}}],"minimum_should_match":1}}'
    );
    console.log(JSON.stringify(c, null, 2));
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

  it('inserts empty buckets for missing data', async () => {
    const searchMock = jest.fn();
    searchMock.mockReturnValue(mockChartsData);
    const database = {
      search: searchMock,
      count: jest.fn(),
      head: jest.fn(),
    };
    const adapter = new ElasticsearchMonitorsAdapter(database);
    expect(await adapter.getMonitorChartsData({}, 'id', 'now-15m', 'now')).toMatchSnapshot();
  });
});
