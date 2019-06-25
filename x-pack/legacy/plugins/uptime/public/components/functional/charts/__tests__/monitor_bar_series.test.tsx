/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { shallowWithIntl } from 'test_utils/enzyme_helpers';
import { MonitorBarSeries, MonitorBarSeriesProps } from '../monitor_bar_series';

describe('MonitorBarSeries component', () => {
  let props: MonitorBarSeriesProps;
  beforeEach(() => {
    props = {
      absoluteStartDate: 1548697920000,
      absoluteEndDate: 1548700920000,
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
  });

  it('renders a series when there are down items', () => {
    const component = shallowWithIntl(<MonitorBarSeries {...props} />);
    expect(component).toMatchSnapshot();
  });

  it('renders null when there are no down items', () => {
    props.histogramSeries = [];
    const component = shallowWithIntl(<MonitorBarSeries {...props} />);
    expect(component).toEqual({});
  });

  it('renders nothing if the down count has no counts', () => {
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
    const component = shallowWithIntl(<MonitorBarSeries {...props} />);
    expect(component).toEqual({});
  });

  it('renders nothing if the data series is null', () => {
    const component = shallowWithIntl(
      <MonitorBarSeries
        absoluteStartDate={123}
        absoluteEndDate={124}
        dangerColor="danger"
        histogramSeries={null}
      />
    );
    expect(component).toEqual({});
  });
});
