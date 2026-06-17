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
      '#e0ecff',
      '#cfe1ff',
      '#bed7ff',
      '#adccff',
      '#9bc2ff',
      '#89b7ff',
      '#76adff',
      '#61a2ff',
    ]);
  });
});

describe('getColorRampCenterColor', () => {
  test('Should get center color from color ramp', () => {
    expect(getColorRampCenterColor('Blues')).toBe('#9bc2ff');
  });
});

describe('getOrdinalMbColorRampStops', () => {
  test('Should create color stops', () => {
    expect(getOrdinalMbColorRampStops('Blues', 0, 1000, false)).toEqual([
      0,
      '#e0ecff',
      125,
      '#cfe1ff',
      250,
      '#bed7ff',
      375,
      '#adccff',
      500,
      '#9bc2ff',
      625,
      '#89b7ff',
      750,
      '#76adff',
      875,
      '#61a2ff',
    ]);
  });

  test('Should create inverted color stops', () => {
    expect(getOrdinalMbColorRampStops('Blues', 0, 1000, true)).toEqual([
      0,
      '#61a2ff',
      125,
      '#76adff',
      250,
      '#89b7ff',
      375,
      '#9bc2ff',
      500,
      '#adccff',
      625,
      '#bed7ff',
      750,
      '#cfe1ff',
      875,
      '#e0ecff',
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
      '#d6e5ff',
      8069,
      '#bad5ff',
      9581.13,
      '#9fc4ff',
      11145.5,
      '#82b3ff',
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
      '#82b3ff',
      9581.13,
      '#9fc4ff',
      11145.5,
      '#bad5ff',
      16958.18,
      '#d6e5ff',
    ]);
  });
});
