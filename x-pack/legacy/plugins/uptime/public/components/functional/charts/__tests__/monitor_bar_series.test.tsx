/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { MonitorBarSeries, MonitorBarSeriesProps } from '../monitor_bar_series';
import { renderWithRouter, shallowWithRouter } from '../../../../lib';
import { SummaryHistogramPoint } from '../../../../../common/graphql/types';

describe('MonitorBarSeries component', () => {
  let props: MonitorBarSeriesProps;
  let histogramSeries: SummaryHistogramPoint[];
  beforeEach(() => {
    props = {
      dangerColor: 'A danger color',
      histogramSeries: [
        {
          timestamp: 124,
          down: 1,
          up: 0,
        },
        {
          timestamp: 125,
          down: 1,
          up: 0,
        },
        {
          timestamp: 126,
          down: 1,
          up: 0,
        },
      ],
    };
    histogramSeries = [
      { timestamp: 1580387868000, up: 0, down: 5 },
      { timestamp: 1580387904000, up: 0, down: 20 },
      {
        timestamp: 1580387940000,
        up: 0,
        down: 19,
      },
      {
        timestamp: 1580387976000,
        up: 0,
        down: 16,
      },
      {
        timestamp: 1580388012000,
        up: 0,
        down: 20,
      },
      {
        timestamp: 1580388048000,
        up: 0,
        down: 15,
      },
      {
        timestamp: 1580388084000,
        up: 0,
        down: 20,
      },
      {
        timestamp: 1580388120000,
        up: 0,
        down: 19,
      },
      {
        timestamp: 1580388156000,
        up: 0,
        down: 16,
      },
      {
        timestamp: 1580388192000,
        up: 0,
        down: 20,
      },
      {
        timestamp: 1580388228000,
        up: 0,
        down: 15,
      },
      {
        timestamp: 1580388264000,
        up: 0,
        down: 20,
      },
      {
        timestamp: 1580388300000,
        up: 0,
        down: 19,
      },
      {
        timestamp: 1580388336000,
        up: 0,
        down: 16,
      },
      {
        timestamp: 1580388372000,
        up: 0,
        down: 20,
      },
      {
        timestamp: 1580388408000,
        up: 0,
        down: 15,
      },
      {
        timestamp: 1580388444000,
        up: 0,
        down: 20,
      },
      {
        timestamp: 1580388480000,
        up: 0,
        down: 19,
      },
      {
        timestamp: 1580388516000,
        up: 0,
        down: 16,
      },
      {
        timestamp: 1580388552000,
        up: 0,
        down: 20,
      },
      {
        timestamp: 1580388588000,
        up: 0,
        down: 15,
      },
      {
        timestamp: 1580388624000,
        up: 0,
        down: 20,
      },
      {
        timestamp: 1580388660000,
        up: 0,
        down: 19,
      },
      {
        timestamp: 1580388696000,
        up: 0,
        down: 16,
      },
      {
        timestamp: 1580388732000,
        up: 0,
        down: 20,
      },
      {
        timestamp: 1580388768000,
        up: 0,
        down: 10,
      },
    ];
  });

  it('shallow renders a series when there are down items', () => {
    const component = shallowWithRouter(<MonitorBarSeries {...props} />);
    expect(component).toMatchSnapshot();
  });

  it('shallow renders null when there are no down items', () => {
    props.histogramSeries = [];
    const component = shallowWithRouter(<MonitorBarSeries {...props} />);
    expect(component).toEqual({});
  });

  it(' shallow renders nothing if the down count has no counts', () => {
    props.histogramSeries = [
      {
        timestamp: 123,
        down: 0,
        up: 1,
      },
      {
        timestamp: 124,
        down: 0,
        up: 0,
      },
      {
        timestamp: 125,
        down: 0,
        up: 0,
      },
    ];
    const component = shallowWithRouter(<MonitorBarSeries {...props} />);
    expect(component).toEqual({});
  });

  it('shallow renders nothing if the data series is null', () => {
    const component = shallowWithRouter(
      <MonitorBarSeries dangerColor="danger" histogramSeries={null} />
    );
    expect(component).toEqual({});
  });

  it('renders if the data series is present', () => {
    const component = renderWithRouter(
      <MonitorBarSeries dangerColor="danger" histogramSeries={histogramSeries} />
    );
    expect(component).toMatchSnapshot();
  });
});
