/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { LegendValue } from '@elastic/charts';
import { cloneDeep } from 'lodash';
import { PieLayerState, PieVisualizationState } from '../../../common/types';

type PersistedPieLayerState = PieLayerState & {
  showValuesInLegend?: boolean;
};

export type PersistedPieVisualizationState = Omit<PieVisualizationState, 'layers'> & {
  layers: PersistedPieLayerState[];
};

export function convertToRuntime(state: PersistedPieVisualizationState) {
  let newState = cloneDeep(state) as unknown as PieVisualizationState;
  newState = convertToLegendStats(newState);
  return newState;
}

function convertToLegendStats(state: PieVisualizationState) {
  state.layers.forEach((l) => {
    if ('showValuesInLegend' in l) {
      l.legendStats = [
        ...new Set([
          ...(l.showValuesInLegend ? [LegendValue.Value] : []),
          ...(l.legendStats || []),
        ]),
      ];
    }
    delete (l as PersistedPieLayerState).showValuesInLegend;
  });

  return state;
}
