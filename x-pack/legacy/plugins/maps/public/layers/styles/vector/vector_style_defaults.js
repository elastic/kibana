/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { VectorStyle } from './vector_style';
import { SYMBOLIZE_AS_CIRCLE, DEFAULT_ICON_SIZE } from './vector_constants';
import { COLOR_GRADIENTS, DEFAULT_FILL_COLORS, DEFAULT_LINE_COLORS } from '../color_utils';

const DEFAULT_ICON = 'airfield';

export const MIN_SIZE = 1;
export const MAX_SIZE = 64;
export const DEFAULT_SIGMA = 3;

export const VECTOR_STYLES = {
  SYMBOL: 'symbol',
  FILL_COLOR: 'fillColor',
  LINE_COLOR: 'lineColor',
  LINE_WIDTH: 'lineWidth',
  ICON_SIZE: 'iconSize',
  ICON_ORIENTATION: 'iconOrientation',
};

export const LINE_STYLES = [VECTOR_STYLES.LINE_COLOR, VECTOR_STYLES.LINE_WIDTH];
export const POLYGON_STYLES = [
  VECTOR_STYLES.FILL_COLOR,
  VECTOR_STYLES.LINE_COLOR,
  VECTOR_STYLES.LINE_WIDTH,
];

export function getDefaultProperties(mapColors = []) {
  return {
    ...getDefaultStaticProperties(mapColors),
    [VECTOR_STYLES.SYMBOL]: {
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
    [VECTOR_STYLES.FILL_COLOR]: {
      type: VectorStyle.STYLE_TYPE.STATIC,
      options: {
        color: nextFillColor,
      },
    },
    [VECTOR_STYLES.LINE_COLOR]: {
      type: VectorStyle.STYLE_TYPE.STATIC,
      options: {
        color: nextLineColor,
      },
    },
    [VECTOR_STYLES.LINE_WIDTH]: {
      type: VectorStyle.STYLE_TYPE.STATIC,
      options: {
        size: 1,
      },
    },
    [VECTOR_STYLES.ICON_SIZE]: {
      type: VectorStyle.STYLE_TYPE.STATIC,
      options: {
        size: DEFAULT_ICON_SIZE,
      },
    },
    [VECTOR_STYLES.ICON_ORIENTATION]: {
      type: VectorStyle.STYLE_TYPE.STATIC,
      options: {
        orientation: 0,
      },
    },
  };
}

export function getDefaultDynamicProperties() {
  return {
    [VECTOR_STYLES.FILL_COLOR]: {
      type: VectorStyle.STYLE_TYPE.DYNAMIC,
      options: {
        color: COLOR_GRADIENTS[0].value,
        field: undefined,
        fieldMetaOptions: {
          isEnabled: true,
          sigma: DEFAULT_SIGMA,
        },
      },
    },
    [VECTOR_STYLES.LINE_COLOR]: {
      type: VectorStyle.STYLE_TYPE.DYNAMIC,
      options: {
        color: COLOR_GRADIENTS[0].value,
        field: undefined,
        fieldMetaOptions: {
          isEnabled: true,
          sigma: DEFAULT_SIGMA,
        },
      },
    },
    [VECTOR_STYLES.LINE_WIDTH]: {
      type: VectorStyle.STYLE_TYPE.DYNAMIC,
      options: {
        minSize: 1,
        maxSize: 10,
        field: undefined,
        fieldMetaOptions: {
          isEnabled: true,
          sigma: DEFAULT_SIGMA,
        },
      },
    },
    [VECTOR_STYLES.ICON_SIZE]: {
      type: VectorStyle.STYLE_TYPE.DYNAMIC,
      options: {
        minSize: 4,
        maxSize: 32,
        field: undefined,
        fieldMetaOptions: {
          isEnabled: true,
          sigma: DEFAULT_SIGMA,
        },
      },
    },
    [VECTOR_STYLES.ICON_ORIENTATION]: {
      type: VectorStyle.STYLE_TYPE.STATIC,
      options: {
        field: undefined,
        fieldMetaOptions: {
          isEnabled: true,
          sigma: DEFAULT_SIGMA,
        },
      },
    },
  };
}
