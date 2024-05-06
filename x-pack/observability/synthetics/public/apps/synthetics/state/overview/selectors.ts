/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createSelector } from 'reselect';

import { SyntheticsAppState } from '../root_reducer';

export const selectOverviewState = (state: SyntheticsAppState) => state.overview;
export const selectOverviewPageState = (state: SyntheticsAppState) => state.overview.pageState;
export const selectOverviewDataState = createSelector(selectOverviewState, (state) => state.data);
export const selectErrorPopoverState = createSelector(
  selectOverviewState,
  (state) => state.isErrorPopoverOpen
);
