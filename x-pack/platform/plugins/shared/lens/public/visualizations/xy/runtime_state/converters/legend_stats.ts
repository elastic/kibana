/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { LegendValue } from '@elastic/charts';

import { XYState } from '../../types';

/**
 * Old color mapping state meant for type safety during runtime migrations of old configurations
 *
 * @deprecated
 */
interface DeprecatedLegendValueXYState extends XYState {
  valuesInLegend?: boolean;
}

export function convertToLegendStats(state: DeprecatedLegendValueXYState | XYState): XYState {
  if ('valuesInLegend' in state) {
    const valuesInLegend = state.valuesInLegend;
    delete state.valuesInLegend;

    const result: XYState = {
      ...state,
      legend: {
        ...state.legend,
        legendStats: [
          ...new Set([
            ...(valuesInLegend ? [LegendValue.CurrentAndLastValue] : []),
            ...(state.legend.legendStats ?? []),
          ]),
        ],
      },
    };

    return result;
  }
  return state;
}
