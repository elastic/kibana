/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { GeneralDatasourceStates } from '@kbn/lens-common';
import type { XYLayerConfig, XYState } from '../../../../../public';
import {
  convertToRawColorMappings,
  getColumnMetaFn,
  isDeprecatedColorMapping,
  type DeprecatedColorMappingConfig,
} from './common';
import type { DeprecatedSplitAccessorLayer } from '../../../v2/transforms/split_accessors/xy';

/** @deprecated */
interface DeprecatedColorMappingLayer extends Omit<DeprecatedSplitAccessorLayer, 'colorMapping'> {
  colorMapping: DeprecatedColorMappingConfig;
}

/**
 * Old color mapping state meant for type safety during runtime migrations of old configurations
 *
 * @deprecated
 */
export interface DeprecatedColorMappingsXYState extends Omit<XYState, 'layers'> {
  layers: Array<DeprecatedColorMappingLayer | XYLayerConfig>;
}

function isDeprecatedColorMappingLayer(
  layer: DeprecatedColorMappingLayer | XYLayerConfig
): layer is DeprecatedColorMappingLayer {
  return (
    layer.layerType === 'data' &&
    (layer.colorMapping?.assignments != null || layer.colorMapping?.specialAssignments != null)
  );
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
    if (isDeprecatedColorMappingLayer(layer)) {
      const accessors =
        'splitAccessor' in layer && layer.splitAccessor != null ? [layer.splitAccessor] : undefined;
      const columnMeta = accessors ? getColumnMeta?.(layer.layerId, accessors) : null;

      return {
        ...layer,
        colorMapping: convertToRawColorMappings(layer.colorMapping, columnMeta),
      };
    }

    return layer;
  });

  return {
    ...state,
    layers: convertedLayers,
  };
};
