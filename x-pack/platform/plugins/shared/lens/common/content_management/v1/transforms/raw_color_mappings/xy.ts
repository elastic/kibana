/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { GeneralDatasourceStates } from '@kbn/lens-common';
import type { XYDataLayerConfig, XYLayerConfig, XYState } from '../../../../../public';
import {
  convertToRawColorMappings,
  getColumnMetaFn,
  isDeprecatedColorMapping,
  type DeprecatedColorMappingConfig,
} from './common';

/** @deprecated */
interface DeprecatedColorMappingLayer extends Omit<XYDataLayerConfig, 'colorMapping'> {
  colorMapping: DeprecatedColorMappingConfig;
}

/**
 * Old color mapping state meant for type safety during runtime migrations of old configurations
 *
 * @deprecated
 */
export interface DeprecatedColorMappingsXYState extends Omit<XYState, 'layers'> {
  layers: Array<XYLayerConfig | DeprecatedColorMappingLayer>;
}

export const convertXYToRawColorMappings = (
  state: XYState | DeprecatedColorMappingsXYState,
  datasourceStates?: Readonly<GeneralDatasourceStates>
): XYState => {
  const getColumnMeta = getColumnMetaFn(datasourceStates);
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
