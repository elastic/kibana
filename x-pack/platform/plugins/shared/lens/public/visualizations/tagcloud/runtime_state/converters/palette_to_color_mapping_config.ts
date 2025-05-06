/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CoreTheme } from '@kbn/core/public';

import { paletteToColorMapping } from '../../../../runtime_state/converters/palette_to_color_mapping';
import { TagcloudState } from '../../types';

export const convertPaletteToColorMappingConfigFn = (theme: CoreTheme) => {
  return (state: TagcloudState): TagcloudState => {
    if (!state.palette) return state;

    return {
      ...state,
      palette: undefined,
      colorMapping: paletteToColorMapping(theme, state.palette, state.colorMapping),
    } satisfies TagcloudState;
  };
};
