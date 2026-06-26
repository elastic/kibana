/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RequiredPaletteParamTypes } from '@kbn/coloring';
import { defaultPaletteParams as sharedDefaultParams } from '../../shared_components';

export const DEFAULT_PALETTE_NAME = 'status';
export const DEFAULT_COLOR_STEPS = 3;

export const defaultPaletteParams: RequiredPaletteParamTypes = {
  ...sharedDefaultParams,
  maxSteps: 5,
  name: DEFAULT_PALETTE_NAME,
  continuity: 'all',
  rangeType: 'number',
  // Named palettes carry no user-defined range; bounds are re-derived from live data at render time.
  // Keep them open (`±Infinity`, serialized to `null` in the saved object) so the stored bounds stay
  // consistent with `continuity: 'all'`, matching the metric chart's number palette.
  rangeMin: -Infinity,
  rangeMax: Infinity,
  steps: DEFAULT_COLOR_STEPS,
};
