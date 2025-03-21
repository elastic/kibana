/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { XYDataLayerConfig, XYState } from '../../types';
import { FormBasedPersistedState } from '../../../../datasources/form_based/types';
import {
  DeprecatedColorMappingConfig,
  convertToRawColorMappings,
  isDeprecatedColorMapping,
} from '../../../../runtime_state/converters/raw_color_mappings';

/** @deprecated */
interface DeprecatedColorMappingLayer extends Omit<XYDataLayerConfig, 'colorMapping'> {
  colorMapping: DeprecatedColorMappingConfig;
}

/**
 * Old color mapping state meant for type safety during runtime migrations of old configurations
 *
 * @deprecated
 */
export interface DeprecatedColorMappingsState extends Omit<XYState, 'layers'> {
  layers: Array<DeprecatedColorMappingLayer | XYDataLayerConfig>;
}

export const convertToRawColorMappingsFn =
  (datasourceState?: FormBasedPersistedState) =>
  (state: DeprecatedColorMappingsState | XYState): XYState => {
    const hasDeprecatedColorMappings = state.layers.some((layer) => {
      return layer.layerType === 'data' && isDeprecatedColorMapping(layer.colorMapping);
    });

    if (!hasDeprecatedColorMappings) return state as XYState;

    const convertedLayers = state.layers.map((layer) => {
      if (
        layer.layerType === 'data' &&
        (layer.colorMapping?.assignments || layer.colorMapping?.specialAssignments)
      ) {
        const accessor = layer.splitAccessor;
        const column = accessor
          ? datasourceState?.layers?.[layer.layerId]?.columns?.[accessor]
          : null;

        return {
          ...layer,
          colorMapping: convertToRawColorMappings(layer.colorMapping, column),
        } satisfies XYDataLayerConfig;
      }

      return layer as XYDataLayerConfig;
    });

    return {
      ...state,
      layers: convertedLayers,
    };
  };
