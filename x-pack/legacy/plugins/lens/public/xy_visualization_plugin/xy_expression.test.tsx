/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { AreaSeries, BarSeries, Position, LineSeries, Settings } from '@elastic/charts';
import { xyChart, XYChart } from './xy_expression';
import { KibanaDatatable } from '../types';
import React from 'react';
import { shallow } from 'enzyme';
import { XYArgs, LegendConfig, legendConfig, XConfig, xConfig, YConfig, yConfig } from './types';

function sampleArgs() {
  const data: KibanaDatatable = {
    type: 'kibana_datatable',
    columns: [{ id: 'a', name: 'a' }, { id: 'b', name: 'b' }, { id: 'c', name: 'c' }],
    rows: [{ a: 1, b: 2, c: 3 }, { a: 1, b: 5, c: 4 }],
  };

  const args: XYArgs = {
    seriesType: 'line',
    legend: {
      isVisible: false,
      position: Position.Top,
    },
    y: {
      accessors: ['a', 'b'],
      labels: ['Label A', 'Label B'],
      position: Position.Left,
      showGridlines: false,
      title: 'A and B',
    },
    x: {
      accessor: 'c',
      position: Position.Bottom,
      showGridlines: false,
      title: 'C',
    },
    splitSeriesAccessors: [],
  };

  return { data, args };
}

describe('xy_expression', () => {
  describe('configs', () => {
    test('legendConfig produces the correct arguments', () => {
      const args: LegendConfig = {
        isVisible: true,
        position: Position.Left,
      };

      expect(legendConfig.fn(null, args, {})).toEqual({
        type: 'lens_xy_legendConfig',
        ...args,
      });
    });

    test('xConfig produces the correct arguments', () => {
      const args: XConfig = {
        accessor: 'foo',
        position: Position.Right,
        showGridlines: true,
        title: 'Foooo!',
      };

      expect(xConfig.fn(null, args, {})).toEqual({
        type: 'lens_xy_xConfig',
        ...args,
      });
    });

    test('yConfig produces the correct arguments', () => {
      const args: YConfig = {
        accessors: ['bar'],
        labels: [''],
        position: Position.Bottom,
        showGridlines: true,
        title: 'Barrrrrr!',
      };

      expect(yConfig.fn(null, args, {})).toEqual({
        type: 'lens_xy_yConfig',
        ...args,
      });
    });
  });

  describe('xyChart', () => {
    test('it renders with the specified data and args', () => {
      const { data, args } = sampleArgs();

      expect(xyChart.fn(data, args, {})).toEqual({
        type: 'render',
        as: 'lens_xy_chart_renderer',
        value: { data, args },
      });
    });
  });

  describe('XYChart component', () => {
    test('it renders line', () => {
      const { data, args } = sampleArgs();

      const component = shallow(<XYChart data={data} args={{ ...args, seriesType: 'line' }} />);
      expect(component).toMatchSnapshot();
      expect(component.find(LineSeries)).toHaveLength(1);
    });

    test('it renders bar', () => {
      const { data, args } = sampleArgs();

      const component = shallow(<XYChart data={data} args={{ ...args, seriesType: 'bar' }} />);
      expect(component).toMatchSnapshot();
      expect(component.find(BarSeries)).toHaveLength(1);
    });

    test('it renders area', () => {
      const { data, args } = sampleArgs();

      const component = shallow(<XYChart data={data} args={{ ...args, seriesType: 'area' }} />);
      expect(component).toMatchSnapshot();
      expect(component.find(AreaSeries)).toHaveLength(1);
    });

    test('it renders horizontal bar', () => {
      const { data, args } = sampleArgs();

      const component = shallow(
        <XYChart data={data} args={{ ...args, seriesType: 'horizontal_bar' }} />
      );
      expect(component).toMatchSnapshot();
      expect(component.find(BarSeries)).toHaveLength(1);
    });

    test('it renders stacked bar', () => {
      const { data, args } = sampleArgs();

      const component = shallow(
        <XYChart data={data} args={{ ...args, seriesType: 'bar_stacked' }} />
      );
      expect(component).toMatchSnapshot();
      expect(component.find(BarSeries)).toHaveLength(1);
      expect(component.find(BarSeries).prop('stackAccessors')).toHaveLength(1);
    });

    test('it renders stacked area', () => {
      const { data, args } = sampleArgs();

      const component = shallow(
        <XYChart data={data} args={{ ...args, seriesType: 'area_stacked' }} />
      );
      expect(component).toMatchSnapshot();
      expect(component.find(AreaSeries)).toHaveLength(1);
      expect(component.find(AreaSeries).prop('stackAccessors')).toHaveLength(1);
    });

    test('it renders stacked horizontal bar', () => {
      const { data, args } = sampleArgs();

      const component = shallow(
        <XYChart data={data} args={{ ...args, seriesType: 'horizontal_bar_stacked' }} />
      );
      expect(component).toMatchSnapshot();
      expect(component.find(BarSeries)).toHaveLength(1);
      expect(component.find(BarSeries).prop('stackAccessors')).toHaveLength(1);
      expect(component.find(Settings).prop('rotation')).toEqual(90);
    });

    test('it remaps rows based on the labels', () => {
      const { data, args } = sampleArgs();

      const chart = shallow(<XYChart data={data} args={{ ...args, seriesType: 'bar' }} />);
      const barSeries = chart.find(BarSeries);

      expect(barSeries.prop('yAccessors')).toEqual(['Label A', 'Label B']);
      expect(barSeries.prop('data')[0]).toEqual({
        'Label A': 1,
        'Label B': 2,
        c: 3,
      });
    });
  });
});
