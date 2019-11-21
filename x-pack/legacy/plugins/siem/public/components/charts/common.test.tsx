/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { shallow } from 'enzyme';
import React from 'react';
import {
  checkIfAllValuesAreZero,
  defaultChartHeight,
  getChartHeight,
  getChartWidth,
  getSeriesStyle,
  getTheme,
  SeriesType,
  WrappedByAutoSizer,
  ChartSeriesData,
} from './common';
import { mergeWithDefaultTheme, LIGHT_THEME } from '@elastic/charts';

jest.mock('@elastic/charts', () => {
  return {
    getSpecId: jest.fn(() => {}),
    mergeWithDefaultTheme: jest.fn(),
  };
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
        barsPadding: 0.05,
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

describe('checkIfAllValuesAreZero', () => {
  const mockInvalidDataSets: Array<[ChartSeriesData[]]> = [
    [
      [
        {
          key: 'mockKey',
          color: 'mockColor',
          value: [
            { x: 1, y: 0 },
            { x: 1, y: 1 },
          ],
        },
      ],
    ],
    [
      [
        {
          key: 'mockKeyA',
          color: 'mockColor',
          value: [
            { x: 1, y: 0 },
            { x: 1, y: 1 },
          ],
        },
        {
          key: 'mockKeyB',
          color: 'mockColor',
          value: [
            { x: 1, y: 0 },
            { x: 1, y: 0 },
          ],
        },
      ],
    ],
  ];
  const mockValidDataSets: Array<[ChartSeriesData[]]> = [
    [
      [
        {
          key: 'mockKey',
          color: 'mockColor',
          value: [
            { x: 0, y: 0 },
            { x: 1, y: 0 },
          ],
        },
      ],
    ],
    [
      [
        {
          key: 'mockKeyA',
          color: 'mockColor',
          value: [
            { x: 1, y: 0 },
            { x: 3, y: 0 },
          ],
        },
        {
          key: 'mockKeyB',
          color: 'mockColor',
          value: [
            { x: 2, y: 0 },
            { x: 4, y: 0 },
          ],
        },
      ],
    ],
  ];

  describe.each(mockInvalidDataSets)('with data [%o]', data => {
    let result: boolean;
    beforeAll(() => {
      result = checkIfAllValuesAreZero(data);
    });

    it(`should return false`, () => {
      expect(result).toBeFalsy();
    });
  });

  describe.each(mockValidDataSets)('with data [%o]', data => {
    let result: boolean;
    beforeAll(() => {
      result = checkIfAllValuesAreZero(data);
    });

    it(`should return true`, () => {
      expect(result).toBeTruthy();
    });
  });
});
