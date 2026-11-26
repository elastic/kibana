/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { extractColorFromStyleProperty } from './extract_color_from_style_property';
import type {
  ColorDynamicOptions,
  ColorDynamicStylePropertyDescriptor,
  ColorStaticOptions,
  ColorStaticStylePropertyDescriptor,
} from '../../../../../../common/descriptor_types';
import { COLOR_MAP_TYPE, FIELD_ORIGIN, STYLE_TYPE } from '../../../../../../common/constants';
import { euiPaletteColorBlind } from '@elastic/eui';

const blue = '#0000ff';
const yellow = '#ffff00';
const green = '#00FF00';
const purple = '#800080';
const defaultColor = '#FFFFFF';
const fieldMetaOptions = {
  is_enabled: true,
};
const field = {
  name: 'myField',
  origin: FIELD_ORIGIN.SOURCE,
};

describe('static', () => {
  test('Should return color', () => {
    const colorStyleProperty = {
      type: STYLE_TYPE.STATIC,
      options: {
        color: blue,
      } as ColorStaticOptions,
    } as ColorStaticStylePropertyDescriptor;
    expect(extractColorFromStyleProperty(colorStyleProperty, defaultColor)).toBe(blue);
  });
});

describe('dynamic', () => {
  test('Should return default color when field is not provided', () => {
    const colorStyleProperty = {
      type: STYLE_TYPE.DYNAMIC,
      options: {
        field_meta_options: fieldMetaOptions,
      } as ColorDynamicOptions,
    } as ColorDynamicStylePropertyDescriptor;
    expect(extractColorFromStyleProperty(colorStyleProperty, defaultColor)).toBe(defaultColor);
  });

  describe('categorical', () => {
    describe('predefined color palette', () => {
      test('Should return default color when color palette is not specified', () => {
        const colorStyleProperty = {
          type: STYLE_TYPE.DYNAMIC,
          options: {
            type: COLOR_MAP_TYPE.CATEGORICAL,
            field,
            field_meta_options: fieldMetaOptions,
          } as ColorDynamicOptions,
        } as ColorDynamicStylePropertyDescriptor;
        expect(extractColorFromStyleProperty(colorStyleProperty, defaultColor)).toBe(defaultColor);
      });

      test('Should return first color from color palette', () => {
        const colorStyleProperty = {
          type: STYLE_TYPE.DYNAMIC,
          options: {
            type: COLOR_MAP_TYPE.CATEGORICAL,
            color_category: 'palette_0',
            field,
            field_meta_options: fieldMetaOptions,
          } as ColorDynamicOptions,
        } as ColorDynamicStylePropertyDescriptor;
        expect(extractColorFromStyleProperty(colorStyleProperty, defaultColor)).toBe(
          euiPaletteColorBlind()[0]
        );
      });
    });

    describe('custom color palette', () => {
      test('Should return default color when custom color palette is not provided', () => {
        const colorStyleProperty = {
          type: STYLE_TYPE.DYNAMIC,
          options: {
            type: COLOR_MAP_TYPE.CATEGORICAL,
            color_category: 'palette_0',
            field,
            field_meta_options: fieldMetaOptions,
            use_custom_color_palette: true,
          } as ColorDynamicOptions,
        } as ColorDynamicStylePropertyDescriptor;
        expect(extractColorFromStyleProperty(colorStyleProperty, defaultColor)).toBe(defaultColor);
      });

      test('Should return first color from custom color palette', () => {
        const colorStyleProperty = {
          type: STYLE_TYPE.DYNAMIC,
          options: {
            type: COLOR_MAP_TYPE.CATEGORICAL,
            color_category: 'palette_0',
            field,
            field_meta_options: fieldMetaOptions,
            use_custom_color_palette: true,
            custom_color_palette: [{ stop: 'myCategory1', color: blue }],
          } as ColorDynamicOptions,
        } as ColorDynamicStylePropertyDescriptor;
        expect(extractColorFromStyleProperty(colorStyleProperty, defaultColor)).toBe(blue);
      });
    });
  });

  describe('ordinal', () => {
    describe('predefined color ramp', () => {
      test('Should return default color when color ramp is not specified', () => {
        const colorStyleProperty = {
          type: STYLE_TYPE.DYNAMIC,
          options: {
            type: COLOR_MAP_TYPE.ORDINAL,
            field,
            field_meta_options: fieldMetaOptions,
          } as ColorDynamicOptions,
        } as ColorDynamicStylePropertyDescriptor;
        expect(extractColorFromStyleProperty(colorStyleProperty, defaultColor)).toBe(defaultColor);
      });

      test('Should return center color from color ramp', () => {
        const colorStyleProperty = {
          type: STYLE_TYPE.DYNAMIC,
          options: {
            type: COLOR_MAP_TYPE.ORDINAL,
            color: 'Blues',
            field,
            field_meta_options: fieldMetaOptions,
          } as ColorDynamicOptions,
        } as ColorDynamicStylePropertyDescriptor;
        expect(extractColorFromStyleProperty(colorStyleProperty, defaultColor)).toBe('#9bc2ff');
      });
    });

    describe('custom color ramp', () => {
      test('Should return default color when custom color ramp is not provided', () => {
        const colorStyleProperty = {
          type: STYLE_TYPE.DYNAMIC,
          options: {
            type: COLOR_MAP_TYPE.ORDINAL,
            field,
            field_meta_options: fieldMetaOptions,
            use_custom_color_ramp: true,
          } as ColorDynamicOptions,
        } as ColorDynamicStylePropertyDescriptor;
        expect(extractColorFromStyleProperty(colorStyleProperty, defaultColor)).toBe(defaultColor);
      });

      test('Should return middle color from custom color ramp (odd # of stops)', () => {
        const colorStyleProperty = {
          type: STYLE_TYPE.DYNAMIC,
          options: {
            type: COLOR_MAP_TYPE.ORDINAL,
            field,
            field_meta_options: fieldMetaOptions,
            use_custom_color_ramp: true,
            custom_color_ramp: [
              { stop: 0, color: blue },
              { stop: 5, color: green },
              { stop: 10, color: yellow },
            ],
          } as ColorDynamicOptions,
        } as ColorDynamicStylePropertyDescriptor;
        expect(extractColorFromStyleProperty(colorStyleProperty, defaultColor)).toBe(green);
      });

      test('Should return middle color from custom color ramp (even # of stops)', () => {
        const colorStyleProperty = {
          type: STYLE_TYPE.DYNAMIC,
          options: {
            type: COLOR_MAP_TYPE.ORDINAL,
            field,
            field_meta_options: fieldMetaOptions,
            use_custom_color_ramp: true,
            custom_color_ramp: [
              { stop: 0, color: blue },
              { stop: 3, color: purple },
              { stop: 6, color: green },
              { stop: 10, color: yellow },
            ],
          } as ColorDynamicOptions,
        } as ColorDynamicStylePropertyDescriptor;
        expect(extractColorFromStyleProperty(colorStyleProperty, defaultColor)).toBe(purple);
      });
    });
  });
});
