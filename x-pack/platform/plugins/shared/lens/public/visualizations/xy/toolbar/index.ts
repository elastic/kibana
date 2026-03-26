/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { XYVisualizationState } from '@kbn/lens-common';

type UnwrapArray<T> = T extends Array<infer P> ? P : T;

export function updateLayer(
  state: XYVisualizationState,
  layer: UnwrapArray<XYVisualizationState['layers']>,
  index: number
): XYVisualizationState {
  return {
    ...state,
    layers: state.layers.map((l, i) => (i === index ? layer : l)),
  };
}

export { XyStyleSettings } from './style_settings';
export { XyLegendSettings } from './legend_settings';
