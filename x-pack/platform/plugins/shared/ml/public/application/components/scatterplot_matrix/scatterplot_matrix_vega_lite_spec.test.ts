/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import 'jest-canvas-mock';

// @ts-ignore
import { compile } from 'vega-lite/build/vega-lite';

import { euiLightVars as euiThemeLight } from '@kbn/ui-theme';

import { LEGEND_TYPES } from '../vega_chart/common';

import {
  getColorSpec,
  getEscapedVegaFieldName,
  getScatterplotMatrixVegaLiteSpec,
  COLOR_RANGE_NOMINAL,
  COLOR_RANGE_OUTLIER,
  COLOR_BLUR,
  USER_SELECTION,
  SINGLE_POINT_CLICK,
} from './scatterplot_matrix_vega_lite_spec';

describe('getColorSpec()', () => {
  it('should return only user selection conditions and the default color for non-outlier specs', () => {
    const colorSpec = getColorSpec(false, euiThemeLight);

    expect(colorSpec).toEqual({
      condition: [{ selection: USER_SELECTION }, { selection: SINGLE_POINT_CLICK }],
      value: COLOR_BLUR,
    });
  });

  it('should return user selection condition and conditional spec for outliers', () => {
    const colorSpec = getColorSpec(false, euiThemeLight, 'outlier_score');

    expect(colorSpec).toEqual({
      condition: {
        selection: USER_SELECTION,
        field: 'is_outlier',
        type: LEGEND_TYPES.NOMINAL,
        scale: {
          range: COLOR_RANGE_OUTLIER,
        },
      },
      value: COLOR_BLUR,
    });
  });

  it('should return user selection condition and a field based spec for non-outlier specs with legendType supplied', () => {
    const colorName = 'the-color-field';

    const colorSpec = getColorSpec(
      false,
      euiThemeLight,
      undefined,
      colorName,
      LEGEND_TYPES.NOMINAL
    );

    expect(colorSpec).toEqual({
      condition: {
        selection: USER_SELECTION,
        field: colorName,
        scale: {
          range: COLOR_RANGE_NOMINAL,
        },
        type: 'nominal',
      },
      value: COLOR_BLUR,
    });
  });
});

describe('getEscapedVegaFieldName()', () => {
  it('should escape dots in field names', () => {
    const fieldName = 'field.name';
    const escapedFieldName = getEscapedVegaFieldName(fieldName);
    expect(escapedFieldName).toBe('field\\.name');
  });

  it('should escape brackets in field names', () => {
    const fieldName = 'field[name]';
    const escapedFieldName = getEscapedVegaFieldName(fieldName);
    expect(escapedFieldName).toBe('field\\[name\\]');
  });

  it('should escape both dots and brackets in field names', () => {
    const fieldName = 'field.name[0]';
    const escapedFieldName = getEscapedVegaFieldName(fieldName);
    expect(escapedFieldName).toBe('field\\.name\\[0\\]');
  });

  it('should return the same string if there are no special characters', () => {
    const fieldName = 'fieldname';
    const escapedFieldName = getEscapedVegaFieldName(fieldName);
    expect(escapedFieldName).toBe('fieldname');
  });

  it('should prepend a string if provided', () => {
    const fieldName = 'field.name';
    const prependString = 'prefix_';
    const escapedFieldName = getEscapedVegaFieldName(fieldName, prependString);
    expect(escapedFieldName).toBe('prefix_field\\.name');
  });

  it('should escape newlines in field names', () => {
    // String quotes process backslashes, so we need to escape them for
    // the test string to contain a backslash. For example, without the
    // double backslash, this string would contain a newline character.
    const fieldName = 'field\\name';
    const escapedFieldName = getEscapedVegaFieldName(fieldName);
    expect(escapedFieldName).toBe('field\\\\name');
  });

  it('should escape backslashes in field names', () => {
    // String quotes process backslashes, so we need to escape them for
    // the test string to contain a backslash.
    const fieldName = 'fieldname\\withbackslash';
    const escapedFieldName = getEscapedVegaFieldName(fieldName);
    expect(escapedFieldName).toBe('fieldname\\\\withbackslash');
  });
});

describe('getScatterplotMatrixVegaLiteSpec()', () => {
  const forCustomLink = false;

  it('should return the default spec for non-outliers without a legend', () => {
    const data = [{ x: 1, y: 1 }];

    const vegaLiteSpec = getScatterplotMatrixVegaLiteSpec(
      forCustomLink,
      data,
      [],
      ['x', 'y'],
      euiThemeLight
    );
    const specForegroundLayer = vegaLiteSpec.spec.layer[0];

    // A valid Vega Lite spec shouldn't throw an error when compiled.
    expect(() => compile(vegaLiteSpec)).not.toThrow();

    expect(vegaLiteSpec.repeat).toEqual({
      column: ['x', 'y'],
      row: ['y', 'x'],
    });
    expect(specForegroundLayer.data.values).toEqual(data);
    expect(specForegroundLayer.mark).toEqual({
      opacity: 0.75,
      size: 8,
      type: 'circle',
    });
    expect(specForegroundLayer.encoding.color).toEqual({
      condition: [{ selection: USER_SELECTION }, { selection: SINGLE_POINT_CLICK }],
      value: COLOR_BLUR,
    });
    expect(specForegroundLayer.encoding.tooltip).toEqual([
      { field: 'x', type: 'quantitative' },
      { field: 'y', type: 'quantitative' },
    ]);
  });

  it('should return the spec for outliers', () => {
    const data = [{ x: 1, y: 1 }];

    const vegaLiteSpec = getScatterplotMatrixVegaLiteSpec(
      forCustomLink,
      data,
      [],
      ['x', 'y'],
      euiThemeLight,
      'ml'
    );
    const specForegroundLayer = vegaLiteSpec.spec.layer[0];

    // A valid Vega Lite spec shouldn't throw an error when compiled.
    expect(() => compile(vegaLiteSpec)).not.toThrow();

    expect(vegaLiteSpec.repeat).toEqual({
      column: ['x', 'y'],
      row: ['y', 'x'],
    });
    expect(specForegroundLayer.data.values).toEqual(data);
    expect(specForegroundLayer.mark).toEqual({
      opacity: 0.75,
      size: 8,
      type: 'circle',
    });
    expect(specForegroundLayer.encoding.color).toEqual({
      condition: {
        selection: USER_SELECTION,
        field: 'is_outlier',
        type: LEGEND_TYPES.NOMINAL,
        scale: {
          range: COLOR_RANGE_OUTLIER,
        },
      },
      value: COLOR_BLUR,
    });
    expect(specForegroundLayer.encoding.tooltip).toEqual([
      { field: 'x', type: 'quantitative' },
      { field: 'y', type: 'quantitative' },
      {
        // Note the escaped dot character
        field: 'ml\\.outlier_score',
        format: '.3f',
        type: 'quantitative',
      },
    ]);
  });

  it('should return the spec for classification', () => {
    const data = [{ x: 1, y: 1 }];

    const vegaLiteSpec = getScatterplotMatrixVegaLiteSpec(
      forCustomLink,
      data,
      [],
      ['x', 'y'],
      euiThemeLight,
      undefined,
      'the-color-field',
      LEGEND_TYPES.NOMINAL
    );
    const specForegroundLayer = vegaLiteSpec.spec.layer[0];

    // A valid Vega Lite spec shouldn't throw an error when compiled.
    expect(() => compile(vegaLiteSpec)).not.toThrow();

    expect(vegaLiteSpec.repeat).toEqual({
      column: ['x', 'y'],
      row: ['y', 'x'],
    });
    expect(specForegroundLayer.data.values).toEqual(data);
    expect(specForegroundLayer.mark).toEqual({
      opacity: 0.75,
      size: 8,
      type: 'circle',
    });
    expect(specForegroundLayer.encoding.color).toEqual({
      condition: {
        selection: USER_SELECTION,
        field: 'the-color-field',
        type: 'nominal',
        scale: {
          range: COLOR_RANGE_NOMINAL,
        },
      },
      value: COLOR_BLUR,
    });
    expect(specForegroundLayer.encoding.tooltip).toEqual([
      { field: 'the-color-field', type: 'nominal' },
      { field: 'x', type: 'quantitative' },
      { field: 'y', type: 'quantitative' },
    ]);
  });

  it('should escape special characters', () => {
    const data = [{ ['x.a']: 1, ['y[a]']: 1 }];

    const vegaLiteSpec = getScatterplotMatrixVegaLiteSpec(
      forCustomLink,
      data,
      [],
      ['x.a', 'y[a]'],
      euiThemeLight,
      undefined,
      'the-color-field',
      LEGEND_TYPES.NOMINAL
    );
    const specForegroundLayer = vegaLiteSpec.spec.layer[0];

    // column values should be escaped
    expect(vegaLiteSpec.repeat).toEqual({
      column: ['x\\.a', 'y\\[a\\]'],
      row: ['y\\[a\\]', 'x\\.a'],
    });
    // raw data should not be escaped
    expect(specForegroundLayer.data.values).toEqual(data);
  });
});
