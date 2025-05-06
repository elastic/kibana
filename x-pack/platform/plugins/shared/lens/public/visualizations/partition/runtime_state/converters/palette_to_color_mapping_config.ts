/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CoreTheme } from '@kbn/core/public';
import { PieLayerState, PieVisualizationState } from '../../../../../common/types';
import { paletteToColorMapping } from '../../../../runtime_state/converters/palette_to_color_mapping';

export const convertPaletteToColorMappingConfigFn = (theme: CoreTheme) => {
  return (state: PieVisualizationState): PieVisualizationState => {
    if (!state.palette) return state;

    const convertedLayers = state.layers.map((layer) => {
      if (layer.layerType === 'data' && layer.primaryGroups.length > 0) {
        return {
          ...layer,
          colorMapping: paletteToColorMapping(theme, state.palette, layer.colorMapping),
        } satisfies PieLayerState;
      }

      return layer as PieLayerState;
    });

    return {
      ...state,
      palette: undefined,
      layers: convertedLayers,
    } satisfies PieVisualizationState;
  };
};
