/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CombinedFormBasedPrivateState, FormBasedLayer, TextBasedLayer } from './types';

export function mergeLayer({
  state,
  layerId,
  newLayer,
}: {
  state: CombinedFormBasedPrivateState;
  layerId: string;
  newLayer: Partial<FormBasedLayer | TextBasedLayer>;
}): CombinedFormBasedPrivateState {
  return {
    ...state,
    layers: {
      ...state.layers,
      [layerId]: { ...state.layers[layerId], ...newLayer },
    } as Record<string, FormBasedLayer | TextBasedLayer>,
  };
}

export function mergeLayers({
  state,
  newLayers,
}: {
  state: CombinedFormBasedPrivateState;
  newLayers: Record<string, FormBasedLayer | TextBasedLayer>;
}) {
  return {
    ...state,
    layers: {
      ...state.layers,
      ...newLayers,
    },
  };
}
