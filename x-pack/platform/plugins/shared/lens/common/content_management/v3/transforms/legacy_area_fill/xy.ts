/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SeriesTypes } from '@kbn/lens-common';
import type { SeriesType, XYVisualizationState } from '@kbn/lens-common';

const AREA_SERIES_TYPES: ReadonlySet<SeriesType> = new Set([
  SeriesTypes.AREA,
  SeriesTypes.AREA_STACKED,
  SeriesTypes.AREA_PERCENTAGE_STACKED,
]);

/**
 * Writes out an explicit `areaFill` to the state if it is not already set, matching the version's default.
 */
export function convertAreaFillDefaultFn(
  state: XYVisualizationState,
  areaFill: NonNullable<XYVisualizationState['areaFill']>
): XYVisualizationState {
  if (state.areaFill !== undefined) return state;

  const hasAreaLayer = state.layers.some(
    (layer) => 'seriesType' in layer && AREA_SERIES_TYPES.has(layer.seriesType)
  );

  if (!hasAreaLayer) return state;

  return { ...state, areaFill };
}
