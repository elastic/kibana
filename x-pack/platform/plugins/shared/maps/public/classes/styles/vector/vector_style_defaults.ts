/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  DEFAULT_ICON,
  LABEL_BORDER_SIZES,
  LABEL_POSITIONS,
  MAX_ZOOM,
  MIN_ZOOM,
  SYMBOLIZE_AS_TYPES,
  VECTOR_STYLES,
  STYLE_TYPE,
} from '../../../../common/constants';

import {
  DEFAULT_FILL_COLORS,
  DEFAULT_LINE_COLORS,
  NUMERICAL_COLOR_PALETTES,
  CATEGORICAL_COLOR_PALETTES,
} from '../color_palettes';
import type { VectorStylePropertiesDescriptor } from '../../../../common/descriptor_types';
import { getIsDarkMode } from '../../../kibana_services';

export const MIN_SIZE = 1;
export const MAX_SIZE = 64;
export const DEFAULT_MIN_SIZE = 7; // Make default large enough to fit default label size
export const DEFAULT_MAX_SIZE = 32;
export const DEFAULT_SIGMA = 3;
export const DEFAULT_LABEL_SIZE = 14;
export const DEFAULT_ICON_SIZE = 6;
export const DEFAULT_COLOR_RAMP = NUMERICAL_COLOR_PALETTES[0].value;
export const DEFAULT_COLOR_PALETTE = CATEGORICAL_COLOR_PALETTES[0].value;

export const LABEL_STYLES = [
  VECTOR_STYLES.LABEL_SIZE,
  VECTOR_STYLES.LABEL_COLOR,
  VECTOR_STYLES.LABEL_BORDER_COLOR,
  VECTOR_STYLES.LABEL_BORDER_SIZE,
];
export const LINE_STYLES = [VECTOR_STYLES.LINE_COLOR, VECTOR_STYLES.LINE_WIDTH, ...LABEL_STYLES];
export const POLYGON_STYLES = [
  VECTOR_STYLES.FILL_COLOR,
  VECTOR_STYLES.LINE_COLOR,
  VECTOR_STYLES.LINE_WIDTH,
  ...LABEL_STYLES,
];

export function getDefaultStaticProperties(
  mapColors: string[] = []
): Required<VectorStylePropertiesDescriptor> {
  let nextColorIndex = 0;
  if (mapColors.length) {
    const lastColor = mapColors[mapColors.length - 1];
    if (DEFAULT_FILL_COLORS.includes(lastColor)) {
      nextColorIndex = (DEFAULT_FILL_COLORS.indexOf(lastColor) + 1) % DEFAULT_FILL_COLORS.length;
    }
  }
  const nextFillColor = DEFAULT_FILL_COLORS[nextColorIndex];
  const nextLineColor = DEFAULT_LINE_COLORS[nextColorIndex];

  const isDarkMode = getIsDarkMode();

  return {
    [VECTOR_STYLES.ICON]: {
      type: STYLE_TYPE.STATIC,
      options: {
        value: DEFAULT_ICON,
      },
    },
    [VECTOR_STYLES.FILL_COLOR]: {
      type: STYLE_TYPE.STATIC,
      options: {
        color: nextFillColor,
      },
    },
    [VECTOR_STYLES.LINE_COLOR]: {
      type: STYLE_TYPE.STATIC,
      options: {
        color: nextLineColor,
      },
    },
    [VECTOR_STYLES.LINE_WIDTH]: {
      type: STYLE_TYPE.STATIC,
      options: {
        size: 1,
      },
    },
    [VECTOR_STYLES.ICON_SIZE]: {
      type: STYLE_TYPE.STATIC,
      options: {
        size: DEFAULT_ICON_SIZE,
      },
    },
    [VECTOR_STYLES.ICON_ORIENTATION]: {
      type: STYLE_TYPE.STATIC,
      options: {
        orientation: 0,
      },
    },
    [VECTOR_STYLES.LABEL_TEXT]: {
      type: STYLE_TYPE.STATIC,
      options: {
        value: '',
      },
    },
    [VECTOR_STYLES.LABEL_COLOR]: {
      type: STYLE_TYPE.STATIC,
      options: {
        color: isDarkMode ? '#FFFFFF' : '#000000',
      },
    },
    [VECTOR_STYLES.LABEL_SIZE]: {
      type: STYLE_TYPE.STATIC,
      options: {
        size: DEFAULT_LABEL_SIZE,
      },
    },
    [VECTOR_STYLES.LABEL_ZOOM_RANGE]: {
      options: {
        use_layer_zoom_range: true,
        min_zoom: MIN_ZOOM,
        max_zoom: MAX_ZOOM,
      },
    },
    [VECTOR_STYLES.LABEL_BORDER_COLOR]: {
      type: STYLE_TYPE.STATIC,
      options: {
        color: isDarkMode ? '#000000' : '#FFFFFF',
      },
    },
    [VECTOR_STYLES.SYMBOLIZE_AS]: {
      options: {
        value: SYMBOLIZE_AS_TYPES.CIRCLE,
      },
    },
    [VECTOR_STYLES.LABEL_BORDER_SIZE]: {
      options: {
        size: LABEL_BORDER_SIZES.SMALL,
      },
    },
    [VECTOR_STYLES.LABEL_POSITION]: {
      options: {
        position: LABEL_POSITIONS.CENTER,
      },
    },
  };
}

export function getDefaultDynamicProperties(): Required<VectorStylePropertiesDescriptor> {
  return {
    [VECTOR_STYLES.ICON]: {
      type: STYLE_TYPE.DYNAMIC,
      options: {
        icon_palette_id: 'filledShapes',
        field: undefined,
        field_meta_options: {
          is_enabled: true,
        },
      },
    },
    [VECTOR_STYLES.FILL_COLOR]: {
      type: STYLE_TYPE.DYNAMIC,
      options: {
        color: DEFAULT_COLOR_RAMP,
        color_category: DEFAULT_COLOR_PALETTE,
        field: undefined,
        field_meta_options: {
          is_enabled: true,
          sigma: DEFAULT_SIGMA,
        },
      },
    },
    [VECTOR_STYLES.LINE_COLOR]: {
      type: STYLE_TYPE.DYNAMIC,
      options: {
        color: DEFAULT_COLOR_RAMP,
        color_category: DEFAULT_COLOR_PALETTE,
        field: undefined,
        field_meta_options: {
          is_enabled: true,
          sigma: DEFAULT_SIGMA,
        },
      },
    },
    [VECTOR_STYLES.LINE_WIDTH]: {
      type: STYLE_TYPE.DYNAMIC,
      options: {
        min_size: 1,
        max_size: 10,
        field: undefined,
        field_meta_options: {
          is_enabled: true,
          sigma: DEFAULT_SIGMA,
        },
      },
    },
    [VECTOR_STYLES.ICON_SIZE]: {
      type: STYLE_TYPE.DYNAMIC,
      options: {
        min_size: DEFAULT_MIN_SIZE,
        max_size: DEFAULT_MAX_SIZE,
        field: undefined,
        field_meta_options: {
          is_enabled: true,
          sigma: DEFAULT_SIGMA,
        },
      },
    },
    [VECTOR_STYLES.ICON_ORIENTATION]: {
      type: STYLE_TYPE.DYNAMIC,
      options: {
        field: undefined,
        field_meta_options: {
          is_enabled: true,
          sigma: DEFAULT_SIGMA,
        },
      },
    },
    [VECTOR_STYLES.LABEL_TEXT]: {
      type: STYLE_TYPE.DYNAMIC,
      options: {
        field: undefined,
      },
    },
    [VECTOR_STYLES.LABEL_ZOOM_RANGE]: {
      options: {
        use_layer_zoom_range: true,
        min_zoom: MIN_ZOOM,
        max_zoom: MAX_ZOOM,
      },
    },
    [VECTOR_STYLES.LABEL_COLOR]: {
      type: STYLE_TYPE.DYNAMIC,
      options: {
        color: DEFAULT_COLOR_RAMP,
        color_category: DEFAULT_COLOR_PALETTE,
        field: undefined,
        field_meta_options: {
          is_enabled: true,
          sigma: DEFAULT_SIGMA,
        },
      },
    },
    [VECTOR_STYLES.LABEL_SIZE]: {
      type: STYLE_TYPE.DYNAMIC,
      options: {
        min_size: DEFAULT_MIN_SIZE,
        max_size: DEFAULT_MAX_SIZE,
        field: undefined,
        field_meta_options: {
          is_enabled: true,
          sigma: DEFAULT_SIGMA,
        },
      },
    },
    [VECTOR_STYLES.LABEL_BORDER_COLOR]: {
      type: STYLE_TYPE.DYNAMIC,
      options: {
        color: DEFAULT_COLOR_RAMP,
        color_category: DEFAULT_COLOR_PALETTE,
        field: undefined,
        field_meta_options: {
          is_enabled: true,
          sigma: DEFAULT_SIGMA,
        },
      },
    },
    [VECTOR_STYLES.SYMBOLIZE_AS]: {
      options: {
        value: SYMBOLIZE_AS_TYPES.CIRCLE,
      },
    },
    [VECTOR_STYLES.LABEL_BORDER_SIZE]: {
      options: {
        size: LABEL_BORDER_SIZES.SMALL,
      },
    },
    [VECTOR_STYLES.LABEL_POSITION]: {
      options: {
        position: LABEL_POSITIONS.CENTER,
      },
    },
  };
}
