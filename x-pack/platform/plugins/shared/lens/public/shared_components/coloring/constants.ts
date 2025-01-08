/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  DEFAULT_PALETTE_NAME,
  FIXED_PROGRESSION,
  DEFAULT_CONTINUITY,
  DEFAULT_RANGE_TYPE,
  DEFAULT_MIN_STOP,
  DEFAULT_MAX_STOP,
  DEFAULT_COLOR_STEPS,
  RequiredPaletteParamTypes,
} from '@kbn/coloring';

export const defaultPaletteParams: RequiredPaletteParamTypes = {
  name: DEFAULT_PALETTE_NAME,
  reverse: false,
  rangeType: DEFAULT_RANGE_TYPE,
  rangeMin: DEFAULT_MIN_STOP,
  rangeMax: DEFAULT_MAX_STOP,
  progression: FIXED_PROGRESSION,
  stops: [],
  steps: DEFAULT_COLOR_STEPS,
  colorStops: [],
  continuity: DEFAULT_CONTINUITY,
};
