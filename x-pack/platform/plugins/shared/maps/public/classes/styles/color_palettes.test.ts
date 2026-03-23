/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  getColorRampCenterColor,
  getOrdinalMbColorRampStops,
  getPercentilesMbColorRampStops,
  getColorPalette,
} from './color_palettes';

describe('getColorPalette', () => {
  test('Should create RGB color ramp', () => {
    expect(getColorPalette('Blues')).toEqual([
      '#d8e7ff',
      '#c8ddff',
      '#b8d4ff',
      '#a8caff',
      '#98c0ff',
      '#87b6ff',
      '#75acff',
      '#61a2ff',
    ]);
  });
});

describe('getColorRampCenterColor', () => {
  test('Should get center color from color ramp', () => {
    expect(getColorRampCenterColor('Blues')).toBe('#98c0ff');
  });
});

describe('getOrdinalMbColorRampStops', () => {
  test('Should create color stops', () => {
    expect(getOrdinalMbColorRampStops('Blues', 0, 1000, false)).toEqual([
      0,
      '#d8e7ff',
      125,
      '#c8ddff',
      250,
      '#b8d4ff',
      375,
      '#a8caff',
      500,
      '#98c0ff',
      625,
      '#87b6ff',
      750,
      '#75acff',
      875,
      '#61a2ff',
    ]);
  });

  test('Should create inverted color stops', () => {
    expect(getOrdinalMbColorRampStops('Blues', 0, 1000, true)).toEqual([
      0,
      '#61a2ff',
      125,
      '#75acff',
      250,
      '#87b6ff',
      375,
      '#98c0ff',
      500,
      '#a8caff',
      625,
      '#b8d4ff',
      750,
      '#c8ddff',
      875,
      '#d8e7ff',
    ]);
  });

  test('xShould snap to end of color stops for identical range', () => {
    expect(getOrdinalMbColorRampStops('Blues', 23, 23, false)).toEqual([23, '#61a2ff']);
  });
});

describe('getPercentilesMbColorRampStops', () => {
  test('Should create color stops', () => {
    const percentiles = [
      { percentile: '50.0', value: 5567.83 },
      { percentile: '75.0', value: 8069 },
      { percentile: '90.0', value: 9581.13 },
      { percentile: '95.0', value: 11145.5 },
      { percentile: '99.0', value: 16958.18 },
    ];
    expect(getPercentilesMbColorRampStops('Blues', percentiles, false)).toEqual([
      5567.83,
      '#cee1ff',
      8069,
      '#b5d2ff',
      9581.13,
      '#9bc2ff',
      11145.5,
      '#80b2ff',
      16958.18,
      '#61a2ff',
    ]);
  });

  test('Should create inverted color stops', () => {
    const percentiles = [
      { percentile: '50.0', value: 5567.83 },
      { percentile: '75.0', value: 8069 },
      { percentile: '90.0', value: 9581.13 },
      { percentile: '95.0', value: 11145.5 },
      { percentile: '99.0', value: 16958.18 },
    ];
    expect(getPercentilesMbColorRampStops('Blues', percentiles, true)).toEqual([
      5567.83,
      '#61a2ff',
      8069,
      '#80b2ff',
      9581.13,
      '#9bc2ff',
      11145.5,
      '#b5d2ff',
      16958.18,
      '#cee1ff',
    ]);
  });
});
