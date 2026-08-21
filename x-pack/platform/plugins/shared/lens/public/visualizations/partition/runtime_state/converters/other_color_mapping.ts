/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { LensPartitionVisualizationState } from '@kbn/lens-common';
import { convertToOtherBucketColorMappings } from '../../../../runtime_state/converters/other_bucket_color_mappings';

export const convertToOtherColorMappingFn = (
  state: LensPartitionVisualizationState
): LensPartitionVisualizationState => {
  const convertedLayers = state.layers.map((layer) => {
    if (layer.layerType === 'data' && layer.colorMapping) {
      return {
        ...layer,
        colorMapping: convertToOtherBucketColorMappings(layer.colorMapping),
      };
    }
    return layer;
  });

  return {
    ...state,
    layers: convertedLayers,
  } satisfies LensPartitionVisualizationState;
};
