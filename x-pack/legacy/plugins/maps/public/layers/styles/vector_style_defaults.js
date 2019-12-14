/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { VectorStyle } from './vector_style';
import { SYMBOLIZE_AS_CIRCLE, DEFAULT_ICON_SIZE } from './vector_constants';
import { COLOR_GRADIENTS, DEFAULT_FILL_COLORS, DEFAULT_LINE_COLORS } from './color_utils';

const DEFAULT_ICON = 'airfield';

export const DEFAULT_MIN_SIZE = 1;
export const DEFAULT_MAX_SIZE = 64;

export const vectorStyles = {
  SYMBOL: 'symbol',
  FILL_COLOR: 'fillColor',
  LINE_COLOR: 'lineColor',
  LINE_WIDTH: 'lineWidth',
  ICON_SIZE: 'iconSize',
  ICON_ORIENTATION: 'iconOrientation',
};

export function getDefaultProperties(mapColors = []) {
  return {
    ...getDefaultStaticProperties(mapColors),
    [vectorStyles.SYMBOL]: {
      options: {
        symbolizeAs: SYMBOLIZE_AS_CIRCLE,
        symbolId: DEFAULT_ICON,
      },
    },
  };
}

export function getDefaultStaticProperties(mapColors = []) {
  // Colors must be state-aware to reduce unnecessary incrementation
  const lastColor = mapColors.pop();
  const nextColorIndex = (DEFAULT_FILL_COLORS.indexOf(lastColor) + 1) % DEFAULT_FILL_COLORS.length;
  const nextFillColor = DEFAULT_FILL_COLORS[nextColorIndex];
  const nextLineColor = DEFAULT_LINE_COLORS[nextColorIndex];

  return {
    [vectorStyles.FILL_COLOR]: {
      type: VectorStyle.STYLE_TYPE.STATIC,
      options: {
        color: nextFillColor,
      },
    },
    [vectorStyles.LINE_COLOR]: {
      type: VectorStyle.STYLE_TYPE.STATIC,
      options: {
        color: nextLineColor,
      },
    },
    [vectorStyles.LINE_WIDTH]: {
      type: VectorStyle.STYLE_TYPE.STATIC,
      options: {
        size: 1,
      },
    },
    [vectorStyles.ICON_SIZE]: {
      type: VectorStyle.STYLE_TYPE.STATIC,
      options: {
        size: DEFAULT_ICON_SIZE,
      },
    },
    [vectorStyles.ICON_ORIENTATION]: {
      type: VectorStyle.STYLE_TYPE.STATIC,
      options: {
        orientation: 0,
      },
    },
  };
}

export function getDefaultDynamicProperties() {
  return {
    [vectorStyles.FILL_COLOR]: {
      type: VectorStyle.STYLE_TYPE.DYNAMIC,
      options: {
        color: COLOR_GRADIENTS[0].value,
        field: undefined,
      },
    },
    [vectorStyles.LINE_COLOR]: {
      type: VectorStyle.STYLE_TYPE.DYNAMIC,
      options: {
        color: COLOR_GRADIENTS[0].value,
        field: undefined,
      },
    },
    [vectorStyles.LINE_WIDTH]: {
      type: VectorStyle.STYLE_TYPE.DYNAMIC,
      options: {
        minSize: DEFAULT_MIN_SIZE,
        maxSize: DEFAULT_MAX_SIZE,
        field: undefined,
      },
    },
    [vectorStyles.ICON_SIZE]: {
      type: VectorStyle.STYLE_TYPE.DYNAMIC,
      options: {
        minSize: DEFAULT_MIN_SIZE,
        maxSize: DEFAULT_MAX_SIZE,
        field: undefined,
      },
    },
    [vectorStyles.ICON_ORIENTATION]: {
      type: VectorStyle.STYLE_TYPE.STATIC,
      options: {
        field: undefined,
      },
    },
  };
}
