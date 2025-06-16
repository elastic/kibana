/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { chartData as mockChartData } from './__mocks__/mock_chart_data_rare';
import seriesConfig from './__mocks__/mock_series_config_rare.json';
import { BehaviorSubject } from 'rxjs';

import React from 'react';
import { render } from '@testing-library/react';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { EuiThemeProvider } from '@elastic/eui';

import { ExplorerChartDistribution } from './explorer_chart_distribution';
import { timeBucketsMock } from '../../util/__mocks__/time_buckets';
import { kibanaContextMock } from '../../contexts/kibana/__mocks__/kibana_context';

const utilityProps = {
  timeBuckets: timeBucketsMock,
  chartTheme: kibanaContextMock.services.charts.theme.useChartsBaseTheme(),
  onPointerUpdate: jest.fn(),
  cursor$: new BehaviorSubject({ isDataHistorgram: true, cursor: { x: 10432423 } }),
  euiTheme: {
    colors: {
      lightestShade: '#F5F7FA',
    },
  },
};

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
    const mockTooltipService = {
      show: jest.fn(),
      hide: jest.fn(),
    };

    const { container } = render(
      <IntlProvider>
        <EuiThemeProvider>
          <KibanaContextProvider services={kibanaContextMock.services}>
            <ExplorerChartDistribution
              mlSelectSeverityService={mlSelectSeverityServiceMock}
              tooltipService={mockTooltipService}
              severity={[{ min: 0, max: 100 }]}
              {...utilityProps}
            />
          </KibanaContextProvider>
        </EuiThemeProvider>
      </IntlProvider>
    );

    // without setting any attributes and corresponding data
    // the directive just ends up being empty.
    expect(container.firstChild).toBeNull();
    expect(container.querySelector('.content-wrapper')).toBeNull();
    expect(container.querySelector('.euiLoadingChart')).toBeNull();
  });

  test('Loading status active, no chart', () => {
    const config = {
      loading: true,
    };

    const mockTooltipService = {
      show: jest.fn(),
      hide: jest.fn(),
    };

    const { container } = render(
      <IntlProvider>
        <EuiThemeProvider>
          <KibanaContextProvider services={kibanaContextMock.services}>
            <ExplorerChartDistribution
              seriesConfig={config}
              mlSelectSeverityService={mlSelectSeverityServiceMock}
              tooltipService={mockTooltipService}
              severity={[{ min: 0, max: 100 }]}
              {...utilityProps}
            />
          </KibanaContextProvider>
        </EuiThemeProvider>
      </IntlProvider>
    );

    // test if the loading indicator is shown
    // Added span because class appears twice with classNames and Emotion
    expect(container.querySelector('span.euiLoadingChart')).toBeInTheDocument();
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
      chartLimits: { min: 201039318, max: 625736376 },
    };

    const mockTooltipService = {
      show: jest.fn(),
      hide: jest.fn(),
    };

    // We create the element including a wrapper which sets the width:
    return render(
      <IntlProvider>
        <EuiThemeProvider>
          <KibanaContextProvider services={kibanaContextMock.services}>
            <div style={{ width: '500px' }}>
              <ExplorerChartDistribution
                seriesConfig={config}
                mlSelectSeverityService={mlSelectSeverityServiceMock}
                tooltipService={mockTooltipService}
                severity={[{ min: 0, max: 100 }]}
                {...utilityProps}
              />
            </div>
          </KibanaContextProvider>
        </EuiThemeProvider>
      </IntlProvider>
    );
  }

  it('Anomaly Explorer Chart with multiple data points', () => {
    const { container } = init(mockChartData);

    // the loading indicator should not be shown
    expect(container.querySelector('.euiLoadingChart')).toBeNull();

    // test if all expected elements are present
    // chart is not rendered via react itself, so we need to query the DOM directly
    const svg = container.getElementsByTagName('svg');
    expect(svg).toHaveLength(1);

    const lineChart = svg[0].getElementsByClassName('line-chart');
    expect(lineChart).toHaveLength(1);

    const rects = lineChart[0].getElementsByTagName('rect');
    expect(rects).toHaveLength(3);

    const chartBorder = rects[0];
    expect(+chartBorder.getAttribute('x')).toBe(0);
    expect(+chartBorder.getAttribute('y')).toBe(0);
    expect(+chartBorder.getAttribute('height')).toBe(170);

    const selectedInterval = rects[1];
    expect(selectedInterval.getAttribute('class')).toBe('selected-interval');
    expect(+selectedInterval.getAttribute('y')).toBe(2);
    expect(+selectedInterval.getAttribute('height')).toBe(166);

    const xAxisTicks = container.querySelector('.x').querySelectorAll('.tick');
    expect([...xAxisTicks]).toHaveLength(6);
    const yAxisTicks = container.querySelector('.y').querySelectorAll('.tick');
    expect([...yAxisTicks]).toHaveLength(5);
    const emphasizedAxisLabel = container.querySelectorAll('.ml-explorer-chart-axis-emphasis');
    expect(emphasizedAxisLabel).toHaveLength(1);
    expect(emphasizedAxisLabel[0].innerHTML).toBe('303');

    const paths = container.querySelectorAll('path');
    expect(paths[0].getAttribute('class')).toBe('domain');
    expect(paths[1].getAttribute('class')).toBe('domain');
    expect(paths[2]).toBe(undefined);

    const dots = container.querySelector('.values-dots').querySelectorAll('circle');
    expect([...dots]).toHaveLength(5);
    expect(dots[0].getAttribute('r')).toBe('1.5');

    const chartMarkers = container.querySelector('.chart-markers').querySelectorAll('circle');
    expect([...chartMarkers]).toHaveLength(5);
    expect([...chartMarkers].map((d) => +d.getAttribute('r'))).toEqual([7, 7, 7, 7, 7]);
  });

  it('Anomaly Explorer Chart with single data point', () => {
    const chartData = [
      {
        date: 1487837700000,
        value: 42,
        entity: '303',
        anomalyScore: 84.08759,
        actual: [1],
        typical: [0.00028318796131582025],
      },
    ];

    const { container } = init(chartData);
    const yAxisTicks = container.querySelector('.y').querySelectorAll('.tick');
    expect([...yAxisTicks]).toHaveLength(1);
  });
});
