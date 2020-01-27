/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import './explorer_chart_single_metric.test.mocks';
import { chartData } from './__mocks__/mock_chart_data';
import seriesConfig from './__mocks__/mock_series_config_filebeat.json';
import seriesConfigRare from './__mocks__/mock_series_config_rare.json';

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
jest.mock('../../services/job_service', () => ({
  mlJobService: {
    getJob: jest.fn(),
  },
}));

// The mocks for ui/chrome and ui/timefilter are copied from charts_utils.test.js
// TODO: Refactor the involved tests to avoid this duplication
jest.mock(
  'ui/chrome',
  () => ({
    addBasePath: () => '/api/ml',
    getBasePath: () => {
      return '<basepath>';
    },
  }),
  { virtual: true }
);

import { shallowWithIntl, mountWithIntl } from 'test_utils/enzyme_helpers';
import React from 'react';

import { chartLimits } from '../../util/chart_utils';
import { getDefaultChartsData } from './explorer_charts_container_service';

import { ExplorerChartsContainer } from './explorer_charts_container';

describe('ExplorerChartsContainer', () => {
  const mockedGetBBox = { x: 0, y: -11.5, width: 12.1875, height: 14.5 };
  const originalGetBBox = SVGElement.prototype.getBBox;
  const rareChartUniqueString = 'y-axis event distribution split by';
  beforeEach(() => (SVGElement.prototype.getBBox = () => mockedGetBBox));
  afterEach(() => (SVGElement.prototype.getBBox = originalGetBBox));

  test('Minimal Initialization', () => {
    const wrapper = shallowWithIntl(<ExplorerChartsContainer {...getDefaultChartsData()} />);

    expect(wrapper.html()).toBe(
      '<div class="euiFlexGrid euiFlexGrid--gutterLarge euiFlexGrid--wrap euiFlexGrid--responsive"></div>'
    );
  });

  test('Initialization with chart data', () => {
    const props = {
      ...getDefaultChartsData(),
      seriesToPlot: [
        {
          ...seriesConfig,
          chartData,
          chartLimits: chartLimits(chartData),
        },
      ],
      chartsPerRow: 1,
      tooManyBuckets: false,
    };
    const wrapper = mountWithIntl(<ExplorerChartsContainer {...props} />);

    // We test child components with snapshots separately
    // so we just do some high level sanity check here.
    expect(wrapper.find('.ml-explorer-chart-container').children()).toHaveLength(2);

    // Check if the additional y-axis information for rare charts is not part of the chart
    expect(wrapper.html().search(rareChartUniqueString)).toBe(-1);
  });

  test('Initialization with rare detector', () => {
    const props = {
      ...getDefaultChartsData(),
      seriesToPlot: [
        {
          ...seriesConfigRare,
          chartData,
          chartLimits: chartLimits(chartData),
        },
      ],
      chartsPerRow: 1,
      tooManyBuckets: false,
    };
    const wrapper = mountWithIntl(<ExplorerChartsContainer {...props} />);

    // We test child components with snapshots separately
    // so we just do some high level sanity check here.
    expect(wrapper.find('.ml-explorer-chart-container').children()).toHaveLength(2);

    // Check if the additional y-axis information for rare charts is part of the chart
    expect(wrapper.html().search(rareChartUniqueString)).toBeGreaterThan(0);
  });
});
