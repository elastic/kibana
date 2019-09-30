/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { shallow, ShallowWrapper } from 'enzyme';
import * as React from 'react';
import {
  ChartHolder,
  getChartHeight,
  getChartWidth,
  WrappedByAutoSizer,
  defaultChartHeight,
  getSeriesStyle,
  SeriesType,
  getTheme,
} from './common';
import 'jest-styled-components';
import { mergeWithDefaultTheme, LIGHT_THEME } from '@elastic/charts';

jest.mock('@elastic/charts', () => {
  return {
    getSpecId: jest.fn(() => {}),
    mergeWithDefaultTheme: jest.fn(),
  };
});

describe('ChartHolder', () => {
  let shallowWrapper: ShallowWrapper;

  it('should render with default props', () => {
    const height = `100%`;
    const width = `100%`;
    shallowWrapper = shallow(<ChartHolder />);
    expect(shallowWrapper.props()).toMatchObject({
      height,
      width,
    });
  });

  it('should render with given props', () => {
    const height = `100px`;
    const width = `100px`;
    shallowWrapper = shallow(<ChartHolder height={height} width={width} />);
    expect(shallowWrapper.props()).toMatchObject({
      height,
      width,
    });
  });
});

describe('WrappedByAutoSizer', () => {
  it('should render correct default height', () => {
    const wrapper = shallow(<WrappedByAutoSizer />);
    expect(wrapper).toHaveStyleRule('height', defaultChartHeight);
  });

  it('should render correct given height', () => {
    const wrapper = shallow(<WrappedByAutoSizer height="100px" />);
    expect(wrapper).toHaveStyleRule('height', '100px');
  });
});

describe('getSeriesStyle', () => {
  it('should not create style mapping if color is not given', () => {
    const mockSeriesKey = 'mockSeriesKey';
    const color = '';
    const customSeriesColors = getSeriesStyle(mockSeriesKey, color, SeriesType.BAR);
    expect(customSeriesColors).toBeUndefined();
  });

  it('should create correct style mapping for series of a chart', () => {
    const mockSeriesKey = 'mockSeriesKey';
    const color = 'red';
    const customSeriesColors = getSeriesStyle(mockSeriesKey, color, SeriesType.BAR);
    const expectedKey = { colorValues: [mockSeriesKey] };
    customSeriesColors!.forEach((value, key) => {
      expect(JSON.stringify(key)).toEqual(JSON.stringify(expectedKey));
      expect(value).toEqual(color);
    });
  });
});

describe('getTheme', () => {
  it('should merge custom theme with default theme', () => {
    const defaultTheme = {
      chartMargins: { bottom: 0, left: 0, right: 0, top: 4 },
      chartPaddings: { bottom: 0, left: 0, right: 0, top: 0 },
      scales: {
        barsPadding: 0.5,
      },
    };
    getTheme();
    expect((mergeWithDefaultTheme as jest.Mock).mock.calls[0][0]).toMatchObject(defaultTheme);
    expect((mergeWithDefaultTheme as jest.Mock).mock.calls[0][1]).toEqual(LIGHT_THEME);
  });
});

describe('getChartHeight', () => {
  it('should render customHeight', () => {
    const height = getChartHeight(10, 100);
    expect(height).toEqual('10px');
  });

  it('should render autoSizerHeight if customHeight is not given', () => {
    const height = getChartHeight(undefined, 100);
    expect(height).toEqual('100px');
  });

  it('should render defaultChartHeight if no custom data is given', () => {
    const height = getChartHeight();
    expect(height).toEqual(defaultChartHeight);
  });
});

describe('getChartWidth', () => {
  it('should render customWidth', () => {
    const height = getChartWidth(10, 100);
    expect(height).toEqual('10px');
  });

  it('should render autoSizerHeight if customHeight is not given', () => {
    const height = getChartWidth(undefined, 100);
    expect(height).toEqual('100px');
  });

  it('should render defaultChartHeight if no custom data is given', () => {
    const height = getChartWidth();
    expect(height).toEqual(defaultChartHeight);
  });
});
