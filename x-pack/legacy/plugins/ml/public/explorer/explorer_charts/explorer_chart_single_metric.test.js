/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import './explorer_chart_single_metric.test.mocks';
import { chartData as mockChartData } from './__mocks__/mock_chart_data';
import seriesConfig from './__mocks__/mock_series_config_filebeat.json';

// Mock TimeBuckets and mlFieldFormatService, they don't play well
// with the jest based test setup yet.
jest.mock('../../util/time_buckets', () => ({
  TimeBuckets: function() {
    this.setBounds = jest.fn();
    this.setInterval = jest.fn();
    this.getScaledDateFormat = jest.fn();
  },
}));
jest.mock('../../services/field_format_service', () => ({
  mlFieldFormatService: {
    getFieldFormat: jest.fn(),
  },
}));
jest.mock('ui/chrome', () => ({
  getBasePath: path => path,
  getUiSettingsClient: () => ({
    get: () => null,
  }),
}));

import { mountWithIntl } from 'test_utils/enzyme_helpers';
import React from 'react';

import { ExplorerChartSingleMetric } from './explorer_chart_single_metric';
import { chartLimits } from '../../util/chart_utils';

describe('ExplorerChart', () => {
  const mlSelectSeverityServiceMock = {
    state: {
      get: () => ({
        val: '',
      }),
    },
  };

  const mockedGetBBox = { x: 0, y: -11.5, width: 12.1875, height: 14.5 };
  const originalGetBBox = SVGElement.prototype.getBBox;
  beforeEach(() => (SVGElement.prototype.getBBox = () => mockedGetBBox));
  afterEach(() => (SVGElement.prototype.getBBox = originalGetBBox));

  test('Initialize', () => {
    const wrapper = mountWithIntl(
      <ExplorerChartSingleMetric.WrappedComponent
        mlSelectSeverityService={mlSelectSeverityServiceMock}
      />
    );

    // without setting any attributes and corresponding data
    // the directive just ends up being empty.
    expect(wrapper.isEmptyRender()).toBeTruthy();
    expect(wrapper.find('.content-wrapper')).toHaveLength(0);
    expect(wrapper.find('.ml-loading-indicator .loading-spinner')).toHaveLength(0);
  });

  test('Loading status active, no chart', () => {
    const config = {
      loading: true,
    };

    const wrapper = mountWithIntl(
      <ExplorerChartSingleMetric.WrappedComponent
        seriesConfig={config}
        mlSelectSeverityService={mlSelectSeverityServiceMock}
      />
    );

    // test if the loading indicator is shown
    expect(wrapper.find('.ml-loading-indicator .loading-spinner')).toHaveLength(1);
  });

  // For the following tests the directive needs to be rendered in the actual DOM,
  // because otherwise there wouldn't be a width available which would
  // trigger SVG errors. We use a fixed width to be able to test for
  // fine grained attributes of the chart.

  // basically a parameterized beforeEach
  function init(chartData) {
    const config = {
      ...seriesConfig,
      chartData,
      chartLimits: chartLimits(chartData),
    };

    // We create the element including a wrapper which sets the width:
    return mountWithIntl(
      <div style={{ width: '500px' }}>
        <ExplorerChartSingleMetric.WrappedComponent
          seriesConfig={config}
          mlSelectSeverityService={mlSelectSeverityServiceMock}
        />
      </div>
    );
  }

  it('Anomaly Explorer Chart with multiple data points', () => {
    const wrapper = init(mockChartData);

    // the loading indicator should not be shown
    expect(wrapper.find('.ml-loading-indicator .loading-spinner')).toHaveLength(0);

    // test if all expected elements are present
    // need to use getDOMNode() because the chart is not rendered via react itself
    const svg = wrapper.getDOMNode().getElementsByTagName('svg');
    expect(svg).toHaveLength(1);

    const lineChart = svg[0].getElementsByClassName('line-chart');
    expect(lineChart).toHaveLength(1);

    const rects = lineChart[0].getElementsByTagName('rect');
    expect(rects).toHaveLength(2);

    const chartBorder = rects[0];
    expect(+chartBorder.getAttribute('x')).toBe(0);
    expect(+chartBorder.getAttribute('y')).toBe(0);
    expect(+chartBorder.getAttribute('height')).toBe(170);

    const selectedInterval = rects[1];
    expect(selectedInterval.getAttribute('class')).toBe('selected-interval');
    expect(+selectedInterval.getAttribute('y')).toBe(2);
    expect(+selectedInterval.getAttribute('height')).toBe(166);

    const xAxisTicks = wrapper
      .getDOMNode()
      .querySelector('.x')
      .querySelectorAll('.tick');
    expect([...xAxisTicks]).toHaveLength(0);
    const yAxisTicks = wrapper
      .getDOMNode()
      .querySelector('.y')
      .querySelectorAll('.tick');
    expect([...yAxisTicks]).toHaveLength(10);

    const paths = wrapper.getDOMNode().querySelectorAll('path');
    expect(paths[0].getAttribute('class')).toBe('domain');
    expect(paths[1].getAttribute('class')).toBe('domain');
    expect(paths[2].getAttribute('class')).toBe('values-line');
    expect(paths[2].getAttribute('d')).toBe(
      'MNaN,159.33024504444444ZMNaN,9.166257955555556LNaN,169.60736875555557'
    );

    const dots = wrapper
      .getDOMNode()
      .querySelector('.values-dots')
      .querySelectorAll('circle');
    expect([...dots]).toHaveLength(1);
    expect(dots[0].getAttribute('r')).toBe('1.5');

    const chartMarkers = wrapper
      .getDOMNode()
      .querySelector('.chart-markers')
      .querySelectorAll('circle');
    expect([...chartMarkers]).toHaveLength(4);
    expect([...chartMarkers].map(d => +d.getAttribute('r'))).toEqual([7, 7, 7, 7]);
  });

  it('Anomaly Explorer Chart with single data point', () => {
    const chartData = [
      {
        date: new Date('2017-02-23T08:00:00.000Z'),
        value: 228243469,
        anomalyScore: 63.32916,
        numberOfCauses: 1,
        actual: [228243469],
        typical: [228243469],
      },
    ];

    const wrapper = init(chartData);

    const yAxisTicks = wrapper
      .getDOMNode()
      .querySelector('.y')
      .querySelectorAll('.tick');
    expect([...yAxisTicks]).toHaveLength(13);
  });
});
