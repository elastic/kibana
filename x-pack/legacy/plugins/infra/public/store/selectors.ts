/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { globalizeSelectors } from '../utils/typed_redux';
import {
  logPositionSelectors as localLogPositionSelectors,
  waffleFilterSelectors as localWaffleFilterSelectors,
  waffleOptionsSelectors as localWaffleOptionsSelectors,
  waffleTimeSelectors as localWaffleTimeSelectors,
} from './local';
import { State } from './reducer';
/**
 * local selectors
 */

const selectLocal = (state: State) => state.local;

export const logPositionSelectors = globalizeSelectors(selectLocal, localLogPositionSelectors);
export const waffleFilterSelectors = globalizeSelectors(selectLocal, localWaffleFilterSelectors);
export const waffleTimeSelectors = globalizeSelectors(selectLocal, localWaffleTimeSelectors);
export const waffleOptionsSelectors = globalizeSelectors(selectLocal, localWaffleOptionsSelectors);
