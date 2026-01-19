/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  XYDataLayerConfig,
  XYLayerConfig,
  XYState,
} from '../../../../../public/visualizations/xy/types';

/** @deprecated */
interface DeprecatedSplitAccessorLayer extends Omit<XYDataLayerConfig, 'splitAccessors'> {
  splitAccessor: string;
}

/**
 * Old color mapping state meant for type safety during runtime migrations of old configurations
 *
 * @deprecated
 */
export interface DeprecatedSplitAccessorState extends Omit<XYState, 'layers'> {
  layers: Array<DeprecatedSplitAccessorLayer | XYLayerConfig>;
}

export function convertToSplitAccessorsFn(state: DeprecatedSplitAccessorState | XYState): XYState {
  const hasDeprecatedSplitAccessor = state.layers.some((layer) => {
    return 'splitAccessor' in layer;
  });

  if (!hasDeprecatedSplitAccessor) return state as XYState;

  const convertedLayers = state.layers.map<XYLayerConfig>((layer) => {
    if ('splitAccessor' in layer) {
      const { splitAccessor, ...rest } = layer;
      return {
        ...rest,
        splitAccessors: [layer.splitAccessor],
      } satisfies XYDataLayerConfig;
    }
    return layer as XYLayerConfig;
  });

  return {
    ...state,
    layers: convertedLayers,
  };
}
