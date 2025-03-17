/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PieLayerState, PieVisualizationState } from '../../../../../common/types';
import { FormBasedPersistedState } from '../../../../datasources/form_based/types';
import {
  DeprecatedColorMappingConfig,
  convertToRawColorMappings,
  isDeprecatedColorMapping,
} from '../../../../runtime_state/converters/raw_color_mappings';

/** @deprecated */
interface DeprecatedColorMappingLayer extends Omit<PieLayerState, 'colorMapping'> {
  colorMapping: DeprecatedColorMappingConfig;
}

/**
 * Old color mapping state meant for type safety during runtime migrations of old configurations
 *
 * @deprecated
 */
export interface DeprecatedColorMappingPieVisualizationState
  extends Omit<PieVisualizationState, 'layers'> {
  layers: Array<DeprecatedColorMappingLayer | PieLayerState>;
}

export const convertToRawColorMappingsFn =
  (datasourceState?: FormBasedPersistedState) =>
  (
    state: DeprecatedColorMappingPieVisualizationState | PieVisualizationState
  ): PieVisualizationState => {
    const hasDeprecatedColorMappings = state.layers.some((layer) => {
      return layer.layerType === 'data' && isDeprecatedColorMapping(layer.colorMapping);
    });

    if (!hasDeprecatedColorMappings) return state as PieVisualizationState;

    const convertedLayers = state.layers.map((layer) => {
      if (
        layer.layerType === 'data' &&
        (layer.colorMapping?.assignments || layer.colorMapping?.specialAssignments)
      ) {
        const [accessor] = layer.primaryGroups;
        const column = accessor
          ? datasourceState?.layers?.[layer.layerId]?.columns?.[accessor]
          : null;

        return {
          ...layer,
          colorMapping: convertToRawColorMappings(layer.colorMapping, column),
        } satisfies PieLayerState;
      }

      return layer as PieLayerState;
    });

    return {
      ...state,
      layers: convertedLayers,
    } satisfies PieVisualizationState;
  };
