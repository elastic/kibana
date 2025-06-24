/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { LegendValue } from '@elastic/charts';

import { PieLayerState, PieVisualizationState } from '../../../../../common/types';

/** @deprecated */
type DeprecatedLegendValueLayer = PieLayerState & {
  showValuesInLegend?: boolean;
};

/**
 * Old color mapping state meant for type safety during runtime migrations of old configurations
 *
 * @deprecated
 */
export type DeprecatedLegendValuePieVisualizationState = Omit<PieVisualizationState, 'layers'> & {
  layers: DeprecatedLegendValueLayer[];
};

export function convertToLegendStats(
  state: DeprecatedLegendValuePieVisualizationState | PieVisualizationState
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
