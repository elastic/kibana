/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RequiredPaletteParamTypes } from '@kbn/coloring';
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
