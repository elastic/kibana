/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { KbnPalette } from '@kbn/palettes';
import type { KbnPaletteId } from '@kbn/palettes';

import type { SeriesType as LensSeriesType } from './types';
import { isLineSeries } from './state_helpers';

/**
 * Returns the default palette id for a given series type.
 */
export const getDefaultPalette = (seriesType: LensSeriesType): KbnPaletteId =>
  isLineSeries(seriesType) ? KbnPalette.ElasticLineOptimized : KbnPalette.Default;
