/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  XYDataLayerConfig,
  XYLayerConfig,
  XYVisualizationState,
} from '../../../../../public/visualizations/xy/types';

/** @deprecated */
export interface DeprecatedSplitAccessorLayer extends Omit<XYDataLayerConfig, 'splitAccessors'> {
  splitAccessor?: string;
}

/**
 * Deprecated single splitAccessor state
 *
 * @deprecated
 */
export interface DeprecatedSplitAccessorState extends Omit<XYVisualizationState, 'layers'> {
  layers: Array<DeprecatedSplitAccessorLayer | XYLayerConfig>;
}

export function convertToSplitAccessorsFn(
  state: DeprecatedSplitAccessorState | XYVisualizationState
): XYVisualizationState {
  const hasDeprecatedSplitAccessor = state.layers.some((layer) => 'splitAccessor' in layer);

  if (!hasDeprecatedSplitAccessor) return state satisfies XYVisualizationState;

  const convertedLayers = state.layers.map<XYLayerConfig>((layer) => {
    if (!('splitAccessor' in layer)) {
      return layer;
    }
    const { splitAccessor, ...rest } = layer;
    if (layer.splitAccessor == null) {
      return rest;
    }
    return {
      ...rest,
      splitAccessors: [layer.splitAccessor],
    };
  });

  return {
    ...state,
    layers: convertedLayers,
  };
}
