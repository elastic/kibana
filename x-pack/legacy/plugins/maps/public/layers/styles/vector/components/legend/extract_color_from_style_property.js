/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { VectorStyle } from '../../vector_style';
import { getColorRampCenterColor, getColorPalette } from '../../../color_utils';
import { COLOR_MAP_TYPE } from '../../../../../../common/constants';

export function extractColorFromStyleProperty(colorStyleProperty, defaultColor) {
  if (!colorStyleProperty) {
    return defaultColor;
  }

  if (colorStyleProperty.type === VectorStyle.STYLE_TYPE.STATIC) {
    return colorStyleProperty.options.color;
  }

  // Do not use dynamic color unless configuration is complete
  if (!colorStyleProperty.options.field || !colorStyleProperty.options.field.name) {
    return defaultColor;
  }

  if (colorStyleProperty.options.type === COLOR_MAP_TYPE.CATEGORICAL) {
    if (colorStyleProperty.options.useCustomColorPalette) {
      return colorStyleProperty.options.customColorPalette &&
        colorStyleProperty.options.customColorPalette.length
        ? colorStyleProperty.options.customColorPalette[0].colorCategory
        : defaultColor;
    }

    if (!colorStyleProperty.options.colorCategory) {
      return null;
    }

    const palette = getColorPalette(colorStyleProperty.options.colorCategory);
    return palette[0];
  } else {
    // return middle of gradient for dynamic style property
    if (colorStyleProperty.options.useCustomColorRamp) {
      if (
        !colorStyleProperty.options.customColorRamp ||
        !colorStyleProperty.options.customColorRamp.length
      ) {
        return defaultColor;
      }
      // favor the lowest color in even arrays
      const middleIndex = Math.floor((colorStyleProperty.options.customColorRamp.length - 1) / 2);
      return colorStyleProperty.options.customColorRamp[middleIndex].color;
    }

    if (!colorStyleProperty.options.color) {
      return null;
    }
    return getColorRampCenterColor(colorStyleProperty.options.color);
  }
}
