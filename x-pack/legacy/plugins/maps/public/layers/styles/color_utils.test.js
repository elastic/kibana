/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  COLOR_GRADIENTS,
  getColorRampCenterColor,
  getColorRampStops,
  getHexColorRangeStrings,
  getLinearGradient,
  getRGBColorRangeStrings,
} from './color_utils';

describe('COLOR_GRADIENTS', () => {
  it('Should contain EuiSuperSelect options list of color ramps', () => {
    expect(COLOR_GRADIENTS.length).toBe(6);
    const colorGradientOption = COLOR_GRADIENTS[0];
    expect(colorGradientOption.value).toBe('Blues');
  });
});

describe('getRGBColorRangeStrings', () => {
  it('Should create RGB color ramp', () => {
    expect(getRGBColorRangeStrings('Blues')).toEqual([
      'rgb(247,250,255)',
      'rgb(221,234,247)',
      'rgb(197,218,238)',
      'rgb(157,201,224)',
      'rgb(106,173,213)',
      'rgb(65,145,197)',
      'rgb(32,112,180)',
      'rgb(7,47,107)',
    ]);
  });
});

describe('getHexColorRangeStrings', () => {
  it('Should create HEX color ramp', () => {
    expect(getHexColorRangeStrings('Blues')).toEqual([
      '#f7faff',
      '#ddeaf7',
      '#c5daee',
      '#9dc9e0',
      '#6aadd5',
      '#4191c5',
      '#2070b4',
      '#072f6b',
    ]);
  });
});

describe('getColorRampCenterColor', () => {
  it('Should get center color from color ramp', () => {
    expect(getColorRampCenterColor('Blues')).toBe('rgb(106,173,213)');
  });
});

describe('getColorRampStops', () => {
  it('Should create color stops for color ramp', () => {
    expect(getColorRampStops('Blues')).toEqual([
      0,
      '#f7faff',
      0.125,
      '#ddeaf7',
      0.25,
      '#c5daee',
      0.375,
      '#9dc9e0',
      0.5,
      '#6aadd5',
      0.625,
      '#4191c5',
      0.75,
      '#2070b4',
      0.875,
      '#072f6b',
    ]);
  });
});

describe('getLinearGradient', () => {
  it('Should create linear gradient from color ramp', () => {
    const colorRamp = [
      'rgb(247,250,255)',
      'rgb(221,234,247)',
      'rgb(197,218,238)',
      'rgb(157,201,224)',
      'rgb(106,173,213)',
      'rgb(65,145,197)',
      'rgb(32,112,180)',
      'rgb(7,47,107)',
    ];
    expect(getLinearGradient(colorRamp)).toBe(
      'linear-gradient(to right, rgb(247,250,255) 0%, rgb(221,234,247)       14%, rgb(197,218,238)       28%, rgb(157,201,224)       42%, rgb(106,173,213)       57%, rgb(65,145,197)       71%, rgb(32,112,180)       85%, rgb(7,47,107) 100%)'
    );
  });
});
