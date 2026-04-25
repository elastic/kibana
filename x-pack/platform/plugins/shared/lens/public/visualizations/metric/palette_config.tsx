/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RequiredPaletteParamTypes } from '@kbn/coloring';
import { KbnPalette } from '@kbn/palettes';
import type { SecondaryTrend, SecondaryTrendType } from '@kbn/lens-common';
import { LENS_METRIC_SECONDARY_DEFAULT_STATIC_COLOR } from '@kbn/lens-common';
import { defaultPaletteParams as sharedDefaultParams } from '../../shared_components';

export const RANGE_MIN = 0;

export const defaultPercentagePaletteParams: RequiredPaletteParamTypes = {
  ...sharedDefaultParams,
  name: 'status',
  rangeType: 'percent',
  steps: 3,
  maxSteps: 5,
  continuity: 'all',
  colorStops: [],
  stops: [],
};

export const defaultNumberPaletteParams: RequiredPaletteParamTypes = {
  ...sharedDefaultParams,
  name: 'status',
  rangeType: 'number',
  rangeMin: -Infinity,
  rangeMax: Infinity,
  steps: 3,
  maxSteps: 5,
  continuity: 'all',
  colorStops: [],
  stops: [],
};

export const DEFAULT_PALETTE_ID = KbnPalette.CompareTo;
export function getDefaultConfigForMode(mode: SecondaryTrendType): SecondaryTrend {
  if (mode === 'none') {
    return { type: 'none' };
  }
  if (mode === 'static') {
    return {
      type: 'static',
      color: LENS_METRIC_SECONDARY_DEFAULT_STATIC_COLOR,
    };
  }
  return {
    type: 'dynamic',
    visuals: 'both',
    paletteId: DEFAULT_PALETTE_ID,
    reversed: false,
    baselineValue: 0,
  };
}
