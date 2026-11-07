/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getColorRampCenterColor, getColorPalette } from '../../../color_palettes';
import { COLOR_MAP_TYPE, STYLE_TYPE } from '../../../../../../common/constants';
import type {
  ColorDynamicOptions,
  ColorStylePropertyDescriptor,
} from '../../../../../../common/descriptor_types';

export function extractColorFromStyleProperty(
  colorStyleProperty: ColorStylePropertyDescriptor | undefined,
  defaultColor: string
): string {
  if (!colorStyleProperty) {
    return defaultColor;
  }

  if (colorStyleProperty.type === STYLE_TYPE.STATIC) {
    return colorStyleProperty.options.color;
  }

  const dynamicOptions: ColorDynamicOptions = colorStyleProperty.options;

  // Do not use dynamic color unless configuration is complete
  if (!dynamicOptions.field || !dynamicOptions.field.name) {
    return defaultColor;
  }

  if (dynamicOptions.type === COLOR_MAP_TYPE.CATEGORICAL) {
    if (dynamicOptions.use_custom_color_palette) {
      return dynamicOptions.custom_color_palette && dynamicOptions.custom_color_palette.length
        ? dynamicOptions.custom_color_palette[0].color
        : defaultColor;
    }

    if (!dynamicOptions.color_category) {
      return defaultColor;
    }

    const palette = getColorPalette(dynamicOptions.color_category);
    return palette ? palette[0] : defaultColor;
  } else {
    // return middle of gradient for dynamic style property
    if (dynamicOptions.use_custom_color_ramp) {
      if (!dynamicOptions.custom_color_ramp || !dynamicOptions.custom_color_ramp.length) {
        return defaultColor;
      }
      // favor the lowest color in even arrays
      const middleIndex = Math.floor((dynamicOptions.custom_color_ramp.length - 1) / 2);
      return dynamicOptions.custom_color_ramp[middleIndex].color;
    }

    if (!dynamicOptions.color) {
      return defaultColor;
    }
    const centerColor = getColorRampCenterColor(dynamicOptions.color);
    return centerColor ? centerColor : defaultColor;
  }
}
