/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { createSelector } from 'reselect';

import { WaffleTimeState } from './reducer';

export const selectCurrentTime = (state: WaffleTimeState) => state.currentTime;

export const selectIsAutoReloading = (state: WaffleTimeState) =>
  state.updatePolicy.policy === 'interval';

export const selectTimeUpdatePolicyInterval = (state: WaffleTimeState) =>
  state.updatePolicy.policy === 'interval' ? state.updatePolicy.interval : null;

export const selectCurrentTimeRange = createSelector(selectCurrentTime, currentTime => ({
  from: currentTime - 1000 * 60 * 5,
  interval: '1m',
  to: currentTime,
}));
