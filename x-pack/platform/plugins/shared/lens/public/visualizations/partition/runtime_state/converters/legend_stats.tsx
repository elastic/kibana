/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { LegendValue } from '@elastic/charts';
import {
  LensPartitionLayerState,
  LensPartitionVisualizationState,
} from '@kbn/visualizations-plugin/common';

/** @deprecated */
type DeprecatedLegendValueLayer = LensPartitionLayerState & {
  showValuesInLegend?: boolean;
};

/**
 * Old color mapping state meant for type safety during runtime migrations of old configurations
 *
 * @deprecated
 */
export type DeprecatedLegendValuePieVisualizationState = Omit<
  LensPartitionVisualizationState,
  'layers'
> & {
  layers: DeprecatedLegendValueLayer[];
};

export function convertToLegendStats(
  state: DeprecatedLegendValuePieVisualizationState | LensPartitionVisualizationState
) {
  state.layers.forEach((l) => {
    if ('showValuesInLegend' in l) {
      l.legendStats = [
        ...new Set([
          ...(l.showValuesInLegend ? [LegendValue.Value] : []),
          ...(l.legendStats ?? []),
        ]),
      ];
    }
    delete (l as DeprecatedLegendValueLayer).showValuesInLegend;
  });

  return state;
}
