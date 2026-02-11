/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  LensPartitionLayerState,
  LensPartitionVisualizationState,
  GeneralDatasourceStates,
} from '@kbn/lens-common';
import type { DeprecatedColorMappingConfig } from '../../../../runtime_state/converters/raw_color_mappings';
import {
  convertToRawColorMappings,
  isDeprecatedColorMapping,
  getColumnMetaFn,
} from '../../../../runtime_state/converters/raw_color_mappings';

/** @deprecated */
interface DeprecatedColorMappingLayer extends Omit<LensPartitionLayerState, 'colorMapping'> {
  colorMapping: DeprecatedColorMappingConfig;
}

/**
 * Old color mapping state meant for type safety during runtime migrations of old configurations
 *
 * @deprecated
 */
export interface DeprecatedColorMappingLensPartitionVisualizationState
  extends Omit<LensPartitionVisualizationState, 'layers'> {
  layers: Array<DeprecatedColorMappingLayer | LensPartitionLayerState>;
}

export const convertToRawColorMappingsFn = (
  datasourceStates?: Readonly<GeneralDatasourceStates>
) => {
  const getColumnMeta = getColumnMetaFn(datasourceStates);

  return (
    state: DeprecatedColorMappingLensPartitionVisualizationState | LensPartitionVisualizationState
  ): LensPartitionVisualizationState => {
    const hasDeprecatedColorMappings = state.layers.some((layer) => {
      return layer.layerType === 'data' && isDeprecatedColorMapping(layer.colorMapping);
    });

    if (!hasDeprecatedColorMappings) return state as LensPartitionVisualizationState;

    const convertedLayers = state.layers.map((layer) => {
      if (
        layer.layerType === 'data' &&
        (layer.colorMapping?.assignments || layer.colorMapping?.specialAssignments)
      ) {
        const [accessor] = layer.primaryGroups;
        const columnMeta = accessor ? getColumnMeta?.(layer.layerId, [accessor]) : null;

        return {
          ...layer,
          colorMapping: convertToRawColorMappings(layer.colorMapping, columnMeta),
        } satisfies LensPartitionLayerState;
      }

      return layer as LensPartitionLayerState;
    });

    return {
      ...state,
      layers: convertedLayers,
    } satisfies LensPartitionVisualizationState;
  };
};
