/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';

import moment from 'moment-timezone';
import React from 'react';
import { renderWithI18n } from '@kbn/test-jest-helpers';
import { createKibanaReactContext } from '@kbn/kibana-react-plugin/public';

import { TimeseriesChart } from './timeseries_chart';

vi.mock('../../../util/time_buckets_service', () => {
      const mocked = {
      timeBucketsServiceFactory: function () {
        return { getTimeBuckets: vi.fn() };
      },
    };
      return { ...mocked, default: mocked };
    });

vi.mock('../../../util/time_series_explorer_service', () => {
      const mocked = {
      timeSeriesExplorerServiceFactory: function () {
        return {
          getAutoZoomDuration: vi.fn(),
          calculateAggregationInterval: vi.fn(),
          calculateInitialFocusRange: vi.fn(),
          calculateDefaultFocusRange: vi.fn(),
          processRecordScoreResults: vi.fn(),
          processMetricPlotResults: vi.fn(),
          processForecastResults: vi.fn(),
          findChartPointForAnomalyTime: vi.fn(),
          processDataForFocusAnomalies: vi.fn(),
          findChartPointForScheduledEvent: vi.fn(),
          processScheduledEventsForChart: vi.fn(),
          getFocusData: vi.fn(),
        };
      },
    };
      return { ...mocked, default: mocked };
    });

function getTimeseriesChartPropsMock() {
  return {
    contextChartSelected: vi.fn(),
    modelPlotEnabled: false,
    renderFocusChartOnly: false,
    showForecast: true,
    showModelBounds: true,
    svgWidth: 1600,
    timefilter: {},
    tooltipService: {},
    sourceIndicesWithGeoFields: {},
  };
}

const kibanaReactContextMock = createKibanaReactContext({
  mlServices: {
    mlApi: {},
    mlResultsService: {},
  },
  notifications: { toasts: { addDanger: vi.fn(), addSuccess: vi.fn() } },
});

describe('TimeseriesChart', () => {
  const mockedGetBBox = { x: 0, y: -10, width: 40, height: 20 };
  const originalGetBBox = SVGElement.prototype.getBBox;
  beforeEach(() => {
    moment.tz.setDefault('UTC');
    SVGElement.prototype.getBBox = () => mockedGetBBox;
  });
  afterEach(() => {
    moment.tz.setDefault('Browser');
    SVGElement.prototype.getBBox = originalGetBBox;
  });

  test('Minimal initialization', () => {
    const props = getTimeseriesChartPropsMock();

    const { container } = renderWithI18n(
      <kibanaReactContextMock.Provider>
        <TimeseriesChart {...props} />
      </kibanaReactContextMock.Provider>
    );

    // Verify the chart container is rendered with the correct class
    expect(container.querySelector('.ml-timeseries-chart-react')).toBeInTheDocument();
    expect(container.innerHTML).toBe('<div class="ml-timeseries-chart-react"></div>');
  });
});
