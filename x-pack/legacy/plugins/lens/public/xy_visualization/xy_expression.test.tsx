/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  AreaSeries,
  Axis,
  BarSeries,
  Position,
  LineSeries,
  Settings,
  ScaleType,
  GeometryValue,
  XYChartSeriesIdentifier,
  SeriesNameFn,
} from '@elastic/charts';
import { xyChart, XYChart } from './xy_expression';
import { LensMultiTable } from '../types';
import {
  KibanaDatatable,
  KibanaDatatableRow,
} from '../../../../../../src/plugins/expressions/public';
import React from 'react';
import { shallow } from 'enzyme';
import { XYArgs, LegendConfig, legendConfig, layerConfig, LayerArgs } from './types';
import { createMockExecutionContext } from '../../../../../../src/plugins/expressions/common/mocks';
import { mountWithIntl } from 'test_utils/enzyme_helpers';

const executeTriggerActions = jest.fn();

const createSampleDatatableWithRows = (rows: KibanaDatatableRow[]): KibanaDatatable => ({
  type: 'kibana_datatable',
  columns: [
    {
      id: 'a',
      name: 'a',
      formatHint: { id: 'number', params: { pattern: '0,0.000' } },
    },
    { id: 'b', name: 'b', formatHint: { id: 'number', params: { pattern: '000,0' } } },
    {
      id: 'c',
      name: 'c',
      formatHint: { id: 'string' },
      meta: { type: 'date-histogram', aggConfigParams: { interval: '10s' } },
    },
    { id: 'd', name: 'ColD', formatHint: { id: 'string' } },
  ],
  rows,
});

const sampleLayer: LayerArgs = {
  layerId: 'first',
  seriesType: 'line',
  xAccessor: 'c',
  accessors: ['a', 'b'],
  splitAccessor: 'd',
  columnToLabel: '{"a": "Label A", "b": "Label B", "d": "Label D"}',
  xScaleType: 'ordinal',
  yScaleType: 'linear',
  isHistogram: false,
};

const createArgsWithLayers = (layers: LayerArgs[] = [sampleLayer]): XYArgs => ({
  xTitle: '',
  yTitle: '',
  legend: {
    type: 'lens_xy_legendConfig',
    isVisible: false,
    position: Position.Top,
  },
  layers,
});

function sampleArgs() {
  const data: LensMultiTable = {
    type: 'lens_multitable',
    tables: {
      first: createSampleDatatableWithRows([
        { a: 1, b: 2, c: 'I', d: 'Foo' },
        { a: 1, b: 5, c: 'J', d: 'Bar' },
      ]),
    },
  };

  const args: XYArgs = createArgsWithLayers();

  return { data, args };
}

describe('xy_expression', () => {
  describe('configs', () => {
    test('legendConfig produces the correct arguments', () => {
      const args: LegendConfig = {
        isVisible: true,
        position: Position.Left,
      };

      const result = legendConfig.fn(null, args, createMockExecutionContext());

      expect(result).toEqual({
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

      const result = layerConfig.fn(null, args, createMockExecutionContext());

      expect(result).toEqual({
        type: 'lens_xy_layer',
        ...args,
      });
    });
  });

  describe('xyChart', () => {
    test('it renders with the specified data and args', () => {
      const { data, args } = sampleArgs();
      const result = xyChart.fn(data, args, createMockExecutionContext());

      expect(result).toEqual({
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
          chartTheme={{}}
          executeTriggerActions={executeTriggerActions}
        />
      );
      expect(component).toMatchSnapshot();
      expect(component.find(LineSeries)).toHaveLength(1);
    });

    describe('date range', () => {
      const timeSampleLayer: LayerArgs = {
        layerId: 'first',
        seriesType: 'line',
        xAccessor: 'c',
        accessors: ['a', 'b'],
        splitAccessor: 'd',
        columnToLabel: '{"a": "Label A", "b": "Label B", "d": "Label D"}',
        xScaleType: 'time',
        yScaleType: 'linear',
        isHistogram: false,
      };
      const multiLayerArgs = createArgsWithLayers([
        timeSampleLayer,
        {
          ...timeSampleLayer,
          layerId: 'second',
          seriesType: 'bar',
          xScaleType: 'time',
        },
      ]);
      test('it uses the full date range', () => {
        const { data, args } = sampleArgs();

        const component = shallow(
          <XYChart
            data={{
              ...data,
              dateRange: {
                fromDate: new Date('2019-01-02T05:00:00.000Z'),
                toDate: new Date('2019-01-03T05:00:00.000Z'),
              },
            }}
            args={{
              ...args,
              layers: [{ ...args.layers[0], seriesType: 'line', xScaleType: 'time' }],
            }}
            formatFactory={getFormatSpy}
            timeZone="UTC"
            chartTheme={{}}
            executeTriggerActions={executeTriggerActions}
          />
        );
        expect(component.find(Settings).prop('xDomain')).toMatchInlineSnapshot(`
          Object {
            "max": 1546491600000,
            "min": 1546405200000,
            "minInterval": undefined,
          }
        `);
      });

      test('it generates correct xDomain for a layer with single value and a layer with no data (1-0) ', () => {
        const data: LensMultiTable = {
          type: 'lens_multitable',
          tables: {
            first: createSampleDatatableWithRows([{ a: 1, b: 2, c: 'I', d: 'Foo' }]),
            second: createSampleDatatableWithRows([]),
          },
        };

        const component = shallow(
          <XYChart
            data={{
              ...data,
              dateRange: {
                fromDate: new Date('2019-01-02T05:00:00.000Z'),
                toDate: new Date('2019-01-03T05:00:00.000Z'),
              },
            }}
            args={multiLayerArgs}
            formatFactory={getFormatSpy}
            timeZone="UTC"
            chartTheme={{}}
            executeTriggerActions={executeTriggerActions}
          />
        );

        expect(component.find(Settings).prop('xDomain')).toMatchInlineSnapshot(`
          Object {
            "max": 1546491600000,
            "min": 1546405200000,
            "minInterval": 10000,
          }
        `);
      });

      test('it generates correct xDomain for two layers with single value(1-1)', () => {
        const data: LensMultiTable = {
          type: 'lens_multitable',
          tables: {
            first: createSampleDatatableWithRows([{ a: 1, b: 2, c: 'I', d: 'Foo' }]),
            second: createSampleDatatableWithRows([{ a: 10, b: 5, c: 'J', d: 'Bar' }]),
          },
        };
        const component = shallow(
          <XYChart
            data={{
              ...data,
              dateRange: {
                fromDate: new Date('2019-01-02T05:00:00.000Z'),
                toDate: new Date('2019-01-03T05:00:00.000Z'),
              },
            }}
            args={multiLayerArgs}
            formatFactory={getFormatSpy}
            timeZone="UTC"
            chartTheme={{}}
            executeTriggerActions={executeTriggerActions}
          />
        );

        expect(component.find(Settings).prop('xDomain')).toMatchInlineSnapshot(`
        Object {
          "max": 1546491600000,
          "min": 1546405200000,
          "minInterval": 10000,
        }
      `);
      });
      test('it generates correct xDomain for a layer with single value and layer with multiple value data (1-n)', () => {
        const data: LensMultiTable = {
          type: 'lens_multitable',
          tables: {
            first: createSampleDatatableWithRows([{ a: 1, b: 2, c: 'I', d: 'Foo' }]),
            second: createSampleDatatableWithRows([
              { a: 10, b: 5, c: 'J', d: 'Bar' },
              { a: 8, b: 5, c: 'K', d: 'Buzz' },
            ]),
          },
        };
        const component = shallow(
          <XYChart
            data={{
              ...data,
              dateRange: {
                fromDate: new Date('2019-01-02T05:00:00.000Z'),
                toDate: new Date('2019-01-03T05:00:00.000Z'),
              },
            }}
            args={multiLayerArgs}
            formatFactory={getFormatSpy}
            timeZone="UTC"
            chartTheme={{}}
            executeTriggerActions={executeTriggerActions}
          />
        );

        expect(component.find(Settings).prop('xDomain')).toMatchInlineSnapshot(`
          Object {
            "max": 1546491600000,
            "min": 1546405200000,
            "minInterval": undefined,
          }
        `);
      });

      test('it generates correct xDomain for 2 layers with multiple value data (n-n)', () => {
        const data: LensMultiTable = {
          type: 'lens_multitable',
          tables: {
            first: createSampleDatatableWithRows([
              { a: 1, b: 2, c: 'I', d: 'Foo' },
              { a: 8, b: 5, c: 'K', d: 'Buzz' },
              { a: 9, b: 7, c: 'L', d: 'Bar' },
              { a: 10, b: 2, c: 'G', d: 'Bear' },
            ]),
            second: createSampleDatatableWithRows([
              { a: 10, b: 5, c: 'J', d: 'Bar' },
              { a: 8, b: 4, c: 'K', d: 'Fi' },
              { a: 1, b: 8, c: 'O', d: 'Pi' },
            ]),
          },
        };
        const component = shallow(
          <XYChart
            data={{
              ...data,
              dateRange: {
                fromDate: new Date('2019-01-02T05:00:00.000Z'),
                toDate: new Date('2019-01-03T05:00:00.000Z'),
              },
            }}
            args={multiLayerArgs}
            formatFactory={getFormatSpy}
            timeZone="UTC"
            chartTheme={{}}
            executeTriggerActions={executeTriggerActions}
          />
        );

        expect(component.find(Settings).prop('xDomain')).toMatchInlineSnapshot(`
        Object {
          "max": 1546491600000,
          "min": 1546405200000,
          "minInterval": undefined,
        }
      `);
      });
    });

    test('it does not use date range if the x is not a time scale', () => {
      const { data, args } = sampleArgs();

      const component = shallow(
        <XYChart
          data={{
            ...data,
            dateRange: {
              fromDate: new Date('2019-01-02T05:00:00.000Z'),
              toDate: new Date('2019-01-03T05:00:00.000Z'),
            },
          }}
          args={{
            ...args,
            layers: [{ ...args.layers[0], seriesType: 'line', xScaleType: 'linear' }],
          }}
          formatFactory={getFormatSpy}
          timeZone="UTC"
          chartTheme={{}}
          executeTriggerActions={executeTriggerActions}
        />
      );
      expect(component.find(Settings).prop('xDomain')).toBeUndefined();
    });

    test('it renders bar', () => {
      const { data, args } = sampleArgs();
      const component = shallow(
        <XYChart
          data={data}
          args={{ ...args, layers: [{ ...args.layers[0], seriesType: 'bar' }] }}
          formatFactory={getFormatSpy}
          timeZone="UTC"
          chartTheme={{}}
          executeTriggerActions={executeTriggerActions}
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
          chartTheme={{}}
          executeTriggerActions={executeTriggerActions}
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
          chartTheme={{}}
          executeTriggerActions={executeTriggerActions}
        />
      );
      expect(component).toMatchSnapshot();
      expect(component.find(BarSeries)).toHaveLength(1);
      expect(component.find(Settings).prop('rotation')).toEqual(90);
    });

    test('onElementClick returns correct context data', () => {
      const geometry: GeometryValue = { x: 5, y: 1, accessor: 'y1' };
      const series = {
        key: 'spec{d}yAccessor{d}splitAccessors{b-2}',
        specId: 'd',
        yAccessor: 'd',
        splitAccessors: {},
        seriesKeys: [2, 'd'],
      };

      const { args, data } = sampleArgs();

      const wrapper = mountWithIntl(
        <XYChart
          data={data}
          args={{
            ...args,
            layers: [
              {
                layerId: 'first',
                isHistogram: true,
                seriesType: 'bar_stacked',
                xAccessor: 'b',
                yScaleType: 'linear',
                xScaleType: 'time',
                splitAccessor: 'b',
                accessors: ['d'],
                columnToLabel: '{"a": "Label A", "b": "Label B", "d": "Label D"}',
              },
            ],
          }}
          formatFactory={getFormatSpy}
          timeZone="UTC"
          chartTheme={{}}
          executeTriggerActions={executeTriggerActions}
        />
      );

      wrapper
        .find(Settings)
        .first()
        .prop('onElementClick')!([[geometry, series as XYChartSeriesIdentifier]]);

      expect(executeTriggerActions).toHaveBeenCalledWith('VALUE_CLICK_TRIGGER', {
        data: {
          data: [
            {
              column: 1,
              row: 1,
              table: data.tables.first,
              value: 5,
            },
            {
              column: 1,
              row: 0,
              table: data.tables.first,
              value: 2,
            },
          ],
        },
      });
    });

    test('it renders stacked bar', () => {
      const { data, args } = sampleArgs();
      const component = shallow(
        <XYChart
          data={data}
          args={{ ...args, layers: [{ ...args.layers[0], seriesType: 'bar_stacked' }] }}
          formatFactory={getFormatSpy}
          timeZone="UTC"
          chartTheme={{}}
          executeTriggerActions={executeTriggerActions}
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
          chartTheme={{}}
          executeTriggerActions={executeTriggerActions}
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
          chartTheme={{}}
          executeTriggerActions={executeTriggerActions}
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
        <XYChart
          data={data}
          args={args}
          formatFactory={getFormatSpy}
          timeZone="CEST"
          chartTheme={{}}
          executeTriggerActions={executeTriggerActions}
        />
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
          chartTheme={{}}
          executeTriggerActions={executeTriggerActions}
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
          chartTheme={{}}
          executeTriggerActions={executeTriggerActions}
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
          chartTheme={{}}
          executeTriggerActions={executeTriggerActions}
        />
      );
      expect(component.find(BarSeries).prop('enableHistogramMode')).toEqual(false);
    });

    test('it names the series for multiple accessors', () => {
      const { data, args } = sampleArgs();

      const component = shallow(
        <XYChart
          data={data}
          args={args}
          formatFactory={getFormatSpy}
          timeZone="UTC"
          chartTheme={{}}
          executeTriggerActions={executeTriggerActions}
        />
      );
      const nameFn = component.find(LineSeries).prop('name') as SeriesNameFn;

      expect(
        nameFn(
          {
            seriesKeys: ['a', 'b', 'c', 'd'],
            key: '',
            specId: 'a',
            yAccessor: '',
            splitAccessors: new Map(),
          },
          false
        )
      ).toEqual('Label A - Label B - c - Label D');
    });

    test('it names the series for a single accessor', () => {
      const { data, args } = sampleArgs();

      const component = shallow(
        <XYChart
          data={data}
          args={{
            ...args,
            layers: [
              {
                ...args.layers[0],
                accessors: ['a'],
              },
            ],
          }}
          formatFactory={getFormatSpy}
          timeZone="UTC"
          chartTheme={{}}
          executeTriggerActions={executeTriggerActions}
        />
      );
      const nameFn = component.find(LineSeries).prop('name') as SeriesNameFn;

      expect(
        nameFn(
          {
            seriesKeys: ['a', 'b', 'c', 'd'],
            key: '',
            specId: 'a',
            yAccessor: '',
            splitAccessors: new Map(),
          },
          false
        )
      ).toEqual('Label A');
    });

    test('it set the scale of the x axis according to the args prop', () => {
      const { data, args } = sampleArgs();

      const component = shallow(
        <XYChart
          data={data}
          args={{ ...args, layers: [{ ...args.layers[0], xScaleType: 'ordinal' }] }}
          formatFactory={getFormatSpy}
          timeZone="UTC"
          chartTheme={{}}
          executeTriggerActions={executeTriggerActions}
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
          chartTheme={{}}
          executeTriggerActions={executeTriggerActions}
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
          chartTheme={{}}
          executeTriggerActions={executeTriggerActions}
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
          chartTheme={{}}
          executeTriggerActions={executeTriggerActions}
        />
      );

      expect(getFormatSpy).toHaveBeenCalledWith({ id: 'number' });
    });

    test('it gets the formatter for the y axis if there is only one accessor', () => {
      const { data, args } = sampleArgs();

      shallow(
        <XYChart
          data={{ ...data }}
          args={{ ...args, layers: [{ ...args.layers[0], accessors: ['a'] }] }}
          formatFactory={getFormatSpy}
          chartTheme={{}}
          timeZone="UTC"
          executeTriggerActions={executeTriggerActions}
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
          chartTheme={{}}
          executeTriggerActions={executeTriggerActions}
        />
      );

      const tickFormatter = instance
        .find(Axis)
        .first()
        .prop('tickFormat');

      if (!tickFormatter) {
        throw new Error('tickFormatter prop not found');
      }

      tickFormatter('I');

      expect(convertSpy).toHaveBeenCalledWith('I');
    });
  });
});
