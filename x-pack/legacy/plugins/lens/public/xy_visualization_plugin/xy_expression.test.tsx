/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Axis } from '@elastic/charts';
import { AreaSeries, BarSeries, Position, LineSeries, Settings, ScaleType } from '@elastic/charts';
import { xyChart, XYChart } from './xy_expression';
import { LensMultiTable } from '../types';
import React from 'react';
import { shallow } from 'enzyme';
import { XYArgs, LegendConfig, legendConfig, layerConfig, LayerArgs } from './types';

function sampleArgs() {
  const data: LensMultiTable = {
    type: 'lens_multitable',
    tables: {
      first: {
        type: 'kibana_datatable',
        columns: [
          {
            id: 'a',
            name: 'a',
            formatHint: { id: 'number', params: { pattern: '0,0.000' } },
          },
          { id: 'b', name: 'b', formatHint: { id: 'number', params: { pattern: '000,0' } } },
          { id: 'c', name: 'c', formatHint: { id: 'string' } },
        ],
        rows: [{ a: 1, b: 2, c: 'I' }, { a: 1, b: 5, c: 'J' }],
      },
    },
  };

  const args: XYArgs = {
    xTitle: '',
    yTitle: '',
    legend: {
      isVisible: false,
      position: Position.Top,
    },
    layers: [
      {
        layerId: 'first',
        seriesType: 'line',
        xAccessor: 'c',
        accessors: ['a', 'b'],
        splitAccessor: 'd',
        columnToLabel: '{"a": "Label A", "b": "Label B", "d": "Label D"}',
        xScaleType: 'ordinal',
        yScaleType: 'linear',
        isHistogram: false,
      },
    ],
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

    test('layerConfig produces the correct arguments', () => {
      const args: LayerArgs = {
        layerId: 'first',
        seriesType: 'line',
        xAccessor: 'c',
        accessors: ['a', 'b'],
        splitAccessor: 'd',
        xScaleType: 'linear',
        yScaleType: 'linear',
        isHistogram: false,
      };

      expect(layerConfig.fn(null, args, {})).toEqual({
        type: 'lens_xy_layer',
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
    let getFormatSpy: jest.Mock;
    let convertSpy: jest.Mock;

    beforeEach(() => {
      convertSpy = jest.fn(x => x);
      getFormatSpy = jest.fn();
      getFormatSpy.mockReturnValue({ convert: convertSpy });
    });

    test('it renders line', () => {
      const { data, args } = sampleArgs();

      const component = shallow(
        <XYChart
          data={data}
          args={{ ...args, layers: [{ ...args.layers[0], seriesType: 'line' }] }}
          formatFactory={getFormatSpy}
          timeZone="UTC"
        />
      );
      expect(component).toMatchSnapshot();
      expect(component.find(LineSeries)).toHaveLength(1);
    });

    test('it renders bar', () => {
      const { data, args } = sampleArgs();
      const component = shallow(
        <XYChart
          data={data}
          args={{ ...args, layers: [{ ...args.layers[0], seriesType: 'bar' }] }}
          formatFactory={getFormatSpy}
          timeZone="UTC"
        />
      );
      expect(component).toMatchSnapshot();
      expect(component.find(BarSeries)).toHaveLength(1);
    });

    test('it renders area', () => {
      const { data, args } = sampleArgs();
      const component = shallow(
        <XYChart
          data={data}
          args={{ ...args, layers: [{ ...args.layers[0], seriesType: 'area' }] }}
          formatFactory={getFormatSpy}
          timeZone="UTC"
        />
      );
      expect(component).toMatchSnapshot();
      expect(component.find(AreaSeries)).toHaveLength(1);
    });

    test('it renders horizontal bar', () => {
      const { data, args } = sampleArgs();
      const component = shallow(
        <XYChart
          data={data}
          args={{ ...args, layers: [{ ...args.layers[0], seriesType: 'bar_horizontal' }] }}
          formatFactory={getFormatSpy}
          timeZone="UTC"
        />
      );
      expect(component).toMatchSnapshot();
      expect(component.find(BarSeries)).toHaveLength(1);
      expect(component.find(Settings).prop('rotation')).toEqual(90);
    });

    test('it renders stacked bar', () => {
      const { data, args } = sampleArgs();
      const component = shallow(
        <XYChart
          data={data}
          args={{ ...args, layers: [{ ...args.layers[0], seriesType: 'bar_stacked' }] }}
          formatFactory={getFormatSpy}
          timeZone="UTC"
        />
      );
      expect(component).toMatchSnapshot();
      expect(component.find(BarSeries)).toHaveLength(1);
      expect(component.find(BarSeries).prop('stackAccessors')).toHaveLength(1);
    });

    test('it renders stacked area', () => {
      const { data, args } = sampleArgs();
      const component = shallow(
        <XYChart
          data={data}
          args={{ ...args, layers: [{ ...args.layers[0], seriesType: 'area_stacked' }] }}
          formatFactory={getFormatSpy}
          timeZone="UTC"
        />
      );
      expect(component).toMatchSnapshot();
      expect(component.find(AreaSeries)).toHaveLength(1);
      expect(component.find(AreaSeries).prop('stackAccessors')).toHaveLength(1);
    });

    test('it renders stacked horizontal bar', () => {
      const { data, args } = sampleArgs();
      const component = shallow(
        <XYChart
          data={data}
          args={{
            ...args,
            layers: [{ ...args.layers[0], seriesType: 'bar_horizontal_stacked' }],
          }}
          formatFactory={getFormatSpy}
          timeZone="UTC"
        />
      );
      expect(component).toMatchSnapshot();
      expect(component.find(BarSeries)).toHaveLength(1);
      expect(component.find(BarSeries).prop('stackAccessors')).toHaveLength(1);
      expect(component.find(Settings).prop('rotation')).toEqual(90);
    });

    test('it passes time zone to the series', () => {
      const { data, args } = sampleArgs();
      const component = shallow(
        <XYChart data={data} args={args} formatFactory={getFormatSpy} timeZone="CEST" />
      );
      expect(component.find(LineSeries).prop('timeZone')).toEqual('CEST');
    });

    test('it applies histogram mode to the series for single series', () => {
      const { data, args } = sampleArgs();
      const firstLayer: LayerArgs = { ...args.layers[0], seriesType: 'bar', isHistogram: true };
      delete firstLayer.splitAccessor;
      const component = shallow(
        <XYChart
          data={data}
          args={{ ...args, layers: [firstLayer] }}
          formatFactory={getFormatSpy}
          timeZone="UTC"
        />
      );
      expect(component.find(BarSeries).prop('enableHistogramMode')).toEqual(true);
    });

    test('it applies histogram mode to the series for stacked series', () => {
      const { data, args } = sampleArgs();
      const component = shallow(
        <XYChart
          data={data}
          args={{
            ...args,
            layers: [
              {
                ...args.layers[0],
                seriesType: 'bar_stacked',
                isHistogram: true,
              },
            ],
          }}
          formatFactory={getFormatSpy}
          timeZone="UTC"
        />
      );
      expect(component.find(BarSeries).prop('enableHistogramMode')).toEqual(true);
    });

    test('it does not apply histogram mode for splitted series', () => {
      const { data, args } = sampleArgs();
      const component = shallow(
        <XYChart
          data={data}
          args={{
            ...args,
            layers: [{ ...args.layers[0], seriesType: 'bar', isHistogram: true }],
          }}
          formatFactory={getFormatSpy}
          timeZone="UTC"
        />
      );
      expect(component.find(BarSeries).prop('enableHistogramMode')).toEqual(false);
    });

    test('it rewrites the rows based on provided labels', () => {
      const { data, args } = sampleArgs();

      const component = shallow(
        <XYChart data={data} args={args} formatFactory={getFormatSpy} timeZone="UTC" />
      );
      expect(component.find(LineSeries).prop('data')).toEqual([
        { 'Label A': 1, 'Label B': 2, c: 'I' },
        { 'Label A': 1, 'Label B': 5, c: 'J' },
      ]);
    });

    test('it uses labels as Y accessors', () => {
      const { data, args } = sampleArgs();

      const component = shallow(
        <XYChart data={data} args={args} formatFactory={getFormatSpy} timeZone="UTC" />
      );
      expect(component.find(LineSeries).prop('yAccessors')).toEqual(['Label A', 'Label B']);
    });

    test('it set the scale of the x axis according to the args prop', () => {
      const { data, args } = sampleArgs();

      const component = shallow(
        <XYChart
          data={data}
          args={{ ...args, layers: [{ ...args.layers[0], xScaleType: 'ordinal' }] }}
          formatFactory={getFormatSpy}
          timeZone="UTC"
        />
      );
      expect(component.find(LineSeries).prop('xScaleType')).toEqual(ScaleType.Ordinal);
    });

    test('it set the scale of the y axis according to the args prop', () => {
      const { data, args } = sampleArgs();

      const component = shallow(
        <XYChart
          data={data}
          args={{ ...args, layers: [{ ...args.layers[0], yScaleType: 'sqrt' }] }}
          formatFactory={getFormatSpy}
          timeZone="UTC"
        />
      );
      expect(component.find(LineSeries).prop('yScaleType')).toEqual(ScaleType.Sqrt);
    });

    test('it gets the formatter for the x axis', () => {
      const { data, args } = sampleArgs();

      shallow(
        <XYChart
          data={{ ...data }}
          args={{ ...args }}
          formatFactory={getFormatSpy}
          timeZone="UTC"
        />
      );

      expect(getFormatSpy).toHaveBeenCalledWith({ id: 'string' });
    });

    test('it gets a default formatter for y if there are multiple y accessors', () => {
      const { data, args } = sampleArgs();

      shallow(
        <XYChart
          data={{ ...data }}
          args={{ ...args }}
          formatFactory={getFormatSpy}
          timeZone="UTC"
        />
      );

      expect(getFormatSpy).toHaveBeenCalledTimes(2);
      expect(getFormatSpy).toHaveBeenCalledWith({ id: 'number' });
    });

    test('it gets the formatter for the y axis if there is only one accessor', () => {
      const { data, args } = sampleArgs();

      shallow(
        <XYChart
          data={{ ...data }}
          args={{ ...args, layers: [{ ...args.layers[0], accessors: ['a'] }] }}
          formatFactory={getFormatSpy}
          timeZone="UTC"
        />
      );
      expect(getFormatSpy).toHaveBeenCalledWith({
        id: 'number',
        params: { pattern: '0,0.000' },
      });
    });

    test('it should pass the formatter function to the axis', () => {
      const { data, args } = sampleArgs();

      const instance = shallow(
        <XYChart
          data={{ ...data }}
          args={{ ...args }}
          formatFactory={getFormatSpy}
          timeZone="UTC"
        />
      );

      const tickFormatter = instance
        .find(Axis)
        .first()
        .prop('tickFormat');
      tickFormatter('I');

      expect(convertSpy).toHaveBeenCalledWith('I');
    });
  });
});
