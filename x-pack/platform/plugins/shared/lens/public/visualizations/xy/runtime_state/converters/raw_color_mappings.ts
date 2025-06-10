/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  DeprecatedColorMappingConfig,
  convertToRawColorMappings,
  getColumnMetaFn,
  isDeprecatedColorMapping,
} from '../../../../runtime_state/converters/raw_color_mappings';
import { GeneralDatasourceStates } from '../../../../state_management';
import { XYDataLayerConfig, XYLayerConfig, XYState } from '../../types';

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
  layers: Array<DeprecatedColorMappingLayer | XYLayerConfig>;
}

export const convertToRawColorMappingsFn = (
  datasourceStates?: Readonly<GeneralDatasourceStates>
) => {
  const getColumnMeta = getColumnMetaFn(datasourceStates);

  return (state: DeprecatedColorMappingsState | XYState): XYState => {
    const hasDeprecatedColorMappings = state.layers.some((layer) => {
      return layer.layerType === 'data' && isDeprecatedColorMapping(layer.colorMapping);
    });

    if (!hasDeprecatedColorMappings) return state as XYState;

    const convertedLayers = state.layers.map<XYLayerConfig>((layer) => {
      if (
        layer.layerType === 'data' &&
        (layer.colorMapping?.assignments || layer.colorMapping?.specialAssignments)
      ) {
        const accessor = layer.splitAccessor;
        const columnMeta = accessor ? getColumnMeta?.(layer.layerId, accessor) : null;

        return {
          ...layer,
          colorMapping: convertToRawColorMappings(layer.colorMapping, columnMeta),
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
