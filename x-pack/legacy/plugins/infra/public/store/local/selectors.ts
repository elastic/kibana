/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { globalizeSelectors } from '../../utils/typed_redux';
import { logPositionSelectors as innerLogPositionSelectors } from './log_position';
import { LocalState } from './reducer';
import { waffleFilterSelectors as innerWaffleFilterSelectors } from './waffle_filter';
import { waffleOptionsSelectors as innerWaffleOptionsSelectors } from './waffle_options';
import { waffleTimeSelectors as innerWaffleTimeSelectors } from './waffle_time';

export const logPositionSelectors = globalizeSelectors(
  (state: LocalState) => state.logPosition,
  innerLogPositionSelectors
);

export const waffleFilterSelectors = globalizeSelectors(
  (state: LocalState) => state.waffleFilter,
  innerWaffleFilterSelectors
);

export const waffleTimeSelectors = globalizeSelectors(
  (state: LocalState) => state.waffleTime,
  innerWaffleTimeSelectors
);

export const waffleOptionsSelectors = globalizeSelectors(
  (state: LocalState) => state.waffleMetrics,
  innerWaffleOptionsSelectors
);
