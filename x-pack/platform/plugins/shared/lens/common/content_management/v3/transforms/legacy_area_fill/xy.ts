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
 * Area charts saved before v3 had no `areaFill` and rendered solid, so pin them to solid
 * before the unset default changes to gradient.
 */
export function convertToLegacyAreaFillFn(state: XYVisualizationState): XYVisualizationState {
  if (state.areaFill !== undefined) return state;

  const hasAreaLayer = state.layers.some(
    (layer) => 'seriesType' in layer && AREA_SERIES_TYPES.has(layer.seriesType)
  );

  if (!hasAreaLayer) return state;

  return { ...state, areaFill: 'solid' };
}
