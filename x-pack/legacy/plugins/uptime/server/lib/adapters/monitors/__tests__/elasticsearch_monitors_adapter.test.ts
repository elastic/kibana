/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { get, set } from 'lodash';
import { elasticsearchMonitorsAdapter as adapter } from '../elasticsearch_monitors_adapter';
import mockChartsData from './monitor_charts_mock.json';
import { assertCloseTo } from '../../../helper';

// FIXME: there are many untested functions in this adapter. They should be tested.
describe('ElasticsearchMonitorsAdapter', () => {
  it('getMonitorChartsData will run expected parameters when no location is specified', async () => {
    expect.assertions(3);
    const searchMock = jest.fn();
    const search = searchMock.bind({});
    await adapter.getMonitorChartsData({
      callES: search,
      monitorId: 'fooID',
      dateRangeStart: 'now-15m',
      dateRangeEnd: 'now',
    });
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
    await adapter.getMonitorChartsData({
      callES: search,
      monitorId: 'fooID',
      dateRangeStart: 'now-15m',
      dateRangeEnd: 'now',
      location: 'Philadelphia',
    });
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
    const search = searchMock.bind({});
    expect(
      await adapter.getMonitorChartsData({
        callES: search,
        monitorId: 'id',
        dateRangeStart: 'now-15m',
        dateRangeEnd: 'now',
      })
    ).toMatchSnapshot();
  });
});
