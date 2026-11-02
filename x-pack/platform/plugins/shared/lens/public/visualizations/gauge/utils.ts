/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Accessors } from '@kbn/expression-gauge-plugin/common';
import type { CustomPaletteParams, PaletteOutput, PaletteRegistry } from '@kbn/coloring';
import { applyPaletteParams } from '@kbn/coloring';
import type { GaugeVisualizationState } from './constants';
import { DEFAULT_PALETTE } from './palette_config';

export const getAccessorsFromState = (state?: GaugeVisualizationState): Accessors | undefined => {
  const { minAccessor, maxAccessor, goalAccessor, metricAccessor } = state ?? {};
  if (!metricAccessor && !maxAccessor && !goalAccessor && !metricAccessor) {
    return;
  }
  return { min: minAccessor, max: maxAccessor, goal: goalAccessor, metric: metricAccessor };
};

export const getDefaultPalette = (
  paletteService: PaletteRegistry
): PaletteOutput<CustomPaletteParams> => ({
  ...DEFAULT_PALETTE,
  params: {
    ...DEFAULT_PALETTE.params,
    stops: applyPaletteParams(paletteService, DEFAULT_PALETTE, { min: 0, max: 100 }),
  },
});
