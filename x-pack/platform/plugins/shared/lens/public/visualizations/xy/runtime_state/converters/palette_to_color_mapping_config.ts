/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CoreTheme } from '@kbn/core/public';

import { XYDataLayerConfig, XYLayerConfig, XYState } from '../../types';
import { paletteToColorMapping } from '../../../../runtime_state/converters/palette_to_color_mapping';

export const convertPaletteToColorMappingConfigFn = (theme: CoreTheme) => {
  return (state: XYState): XYState => {
    const convertedLayers = state.layers.map<XYLayerConfig>((layer) => {
      if (layer.layerType === 'data' && layer.palette) {
        return {
          ...layer,
          palette: undefined,
          colorMapping: paletteToColorMapping(theme, layer.palette, layer.colorMapping),
        } satisfies XYDataLayerConfig;
      }

      return layer as XYLayerConfig;
    });

    return {
      ...state,
      layers: convertedLayers,
    };
  };
};
