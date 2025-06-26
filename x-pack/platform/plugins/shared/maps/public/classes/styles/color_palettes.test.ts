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
      '#e4eefd',
      '#d3e3fe',
      '#c1d8fe',
      '#afceff',
      '#9dc3ff',
      '#8bb8ff',
      '#77adff',
      '#61a2ff',
    ]);
  });
});

describe('getColorRampCenterColor', () => {
  test('Should get center color from color ramp', () => {
    expect(getColorRampCenterColor('Blues')).toBe('#9dc3ff');
  });
});

describe('getOrdinalMbColorRampStops', () => {
  test('Should create color stops', () => {
    expect(getOrdinalMbColorRampStops('Blues', 0, 1000, false)).toEqual([
      0,
      '#e4eefd',
      125,
      '#d3e3fe',
      250,
      '#c1d8fe',
      375,
      '#afceff',
      500,
      '#9dc3ff',
      625,
      '#8bb8ff',
      750,
      '#77adff',
      875,
      '#61a2ff',
    ]);
  });

  test('Should create inverted color stops', () => {
    expect(getOrdinalMbColorRampStops('Blues', 0, 1000, true)).toEqual([
      0,
      '#61a2ff',
      125,
      '#77adff',
      250,
      '#8bb8ff',
      375,
      '#9dc3ff',
      500,
      '#afceff',
      625,
      '#c1d8fe',
      750,
      '#d3e3fe',
      875,
      '#e4eefd',
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
      '#dae8fd',
      8069,
      '#bed6fe',
      9581.13,
      '#a1c5ff',
      11145.5,
      '#83b3ff',
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
      '#83b3ff',
      9581.13,
      '#a1c5ff',
      11145.5,
      '#bed6fe',
      16958.18,
      '#dae8fd',
    ]);
  });
});
