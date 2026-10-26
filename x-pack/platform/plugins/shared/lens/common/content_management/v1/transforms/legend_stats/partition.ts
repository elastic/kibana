/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ChartLegendValue } from '@kbn/chart-expressions-common';

import type { LensPartitionLayerState, LensPartitionVisualizationState } from '@kbn/lens-common';

/** @deprecated */
type DeprecatedLegendValueLayer = LensPartitionLayerState & {
  showValuesInLegend?: boolean;
};

/**
 * Old color mapping state meant for type safety during runtime migrations of old configurations
 *
 * @deprecated
 */
export type DeprecatedLegendValueLensPartitionVisualizationState = Omit<
  LensPartitionVisualizationState,
  'layers'
> & {
  layers: DeprecatedLegendValueLayer[];
};

export function convertPartitionToLegendStats(
  state: DeprecatedLegendValueLensPartitionVisualizationState | LensPartitionVisualizationState
) {
  state.layers.forEach((l) => {
    if ('showValuesInLegend' in l) {
      l.legendStats = [
        ...new Set([
          ...(l.showValuesInLegend ? [ChartLegendValue.Value] : []),
          ...(l.legendStats ?? []),
        ]),
      ];
    }
    delete (l as DeprecatedLegendValueLayer).showValuesInLegend;
  });

  return state;
}
