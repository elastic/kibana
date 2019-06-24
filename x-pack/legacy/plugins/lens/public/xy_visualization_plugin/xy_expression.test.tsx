/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

jest.mock(
  '../../../../../../src/legacy/ui/public/visualize/loader/pipeline_helpers/utilities',
  () => {
    const formatterSpy = jest.fn();
    const getFormatSpy = jest.fn(() => {
      return { convert: formatterSpy };
    });
    return { getFormat: getFormatSpy };
  }
);

import { Position, Axis } from '@elastic/charts';
import { xyChart, XYChart } from './xy_expression';
import React from 'react';
import { shallow } from 'enzyme';
import { XYArgs, LegendConfig, legendConfig, XConfig, xConfig, YConfig, yConfig } from './types';
import { getFormat } from '../../../../../../src/legacy/ui/public/visualize/loader/pipeline_helpers/utilities';
import { KibanaDatatable } from 'src/legacy/core_plugins/interpreter/common';

function sampleArgs() {
  const data: KibanaDatatable = {
    type: 'kibana_datatable',
    columns: [
      { id: 'a', name: 'a', formatterMapping: { id: 'number', params: { pattern: '0,0.000' } } },
      { id: 'b', name: 'b', formatterMapping: { id: 'number', params: { pattern: '000,0' } } },
      { id: 'c', name: 'c', formatterMapping: { id: 'string' } },
    ],
    rows: [{ a: 1, b: 2, c: 'I' }, { a: 1, b: 5, c: 'J' }],
  };

  const args: XYArgs = {
    seriesType: 'line',
    title: 'My fanci line chart',
    legend: {
      isVisible: false,
      position: Position.Top,
    },
    y: {
      accessors: ['a', 'b'],
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
    stackAccessors: [],
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
    beforeEach(() => {
      jest.clearAllMocks();
    });

    test('it renders line', () => {
      const { data, args } = sampleArgs();

      expect(
        shallow(<XYChart data={data} args={{ ...args, seriesType: 'line' }} />)
      ).toMatchSnapshot();
    });

    test('it renders bar', () => {
      const { data, args } = sampleArgs();

      expect(
        shallow(<XYChart data={data} args={{ ...args, seriesType: 'bar' }} />)
      ).toMatchSnapshot();
    });

    test('it renders area', () => {
      const { data, args } = sampleArgs();

      expect(
        shallow(<XYChart data={data} args={{ ...args, seriesType: 'area' }} />)
      ).toMatchSnapshot();
    });

    test('it gets the formatter for the x axis', () => {
      const { data, args } = sampleArgs();

      shallow(<XYChart data={{ ...data }} args={{ ...args }} />);

      expect(getFormat as jest.Mock).toHaveBeenCalledWith({ id: 'string' });
    });

    test('it gets a default formatter for y if there are multiple y accessors', () => {
      const { data, args } = sampleArgs();

      shallow(<XYChart data={{ ...data }} args={{ ...args }} />);

      expect(getFormat as jest.Mock).toHaveBeenCalledTimes(2);
      expect(getFormat as jest.Mock).toHaveBeenCalledWith({ id: 'number' });
    });

    test('it gets the formatter for the y axis if there is only one accessor', () => {
      const { data, args } = sampleArgs();

      shallow(
        <XYChart data={{ ...data }} args={{ ...args, y: { ...args.y, accessors: ['a'] } }} />
      );

      expect(getFormat as jest.Mock).toHaveBeenCalledTimes(2);
      expect(getFormat as jest.Mock).toHaveBeenCalledWith({
        id: 'number',
        params: { pattern: '0,0.000' },
      });
    });

    test('it should pass the formatter function to the axis', () => {
      const { data, args } = sampleArgs();

      const instance = shallow(<XYChart data={{ ...data }} args={{ ...args }} />);

      const tickFormatter = instance
        .find(Axis)
        .first()
        .prop('tickFormat');
      tickFormatter('I');

      expect(getFormat({}).convert as jest.Mock).toHaveBeenCalledWith('I');
    });
  });
});
