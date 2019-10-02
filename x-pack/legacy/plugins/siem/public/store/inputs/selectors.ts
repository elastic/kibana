/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { createSelector } from 'reselect';

import { State } from '../reducer';

import { InputsModel, InputsRange, GlobalQuery } from './model';

const selectInputs = (state: State): InputsModel => state.inputs;

const selectGlobal = (state: State): InputsRange => state.inputs.global;

const selectTimeline = (state: State): InputsRange => state.inputs.timeline;

const selectGlobalQuery = (state: State, id: string): GlobalQuery =>
  state.inputs.global.query.find(q => q.id === id) || {
    id: '',
    inspect: null,
    isInspected: false,
    loading: false,
    refetch: null,
    selectedInspectIndex: 0,
  };

const selectTimelineQuery = (state: State, id: string): GlobalQuery =>
  state.inputs.timeline.query.find(q => q.id === id) ||
  state.inputs.global.query.find(q => q.id === id) || {
    id: '',
    inspect: null,
    isInspected: false,
    loading: false,
    refetch: null,
    selectedInspectIndex: 0,
  };

export const inputsSelector = () =>
  createSelector(
    selectInputs,
    inputs => inputs
  );

export const timelineTimeRangeSelector = createSelector(
  selectTimeline,
  timeline => timeline.timerange
);

export const globalTimeRangeSelector = createSelector(
  selectGlobal,
  global => global.timerange
);

export const globalPolicySelector = createSelector(
  selectGlobal,
  global => global.policy
);

export const globalQuery = createSelector(
  selectGlobal,
  global => global.query
);

export const globalQueryByIdSelector = () =>
  createSelector(
    selectGlobalQuery,
    query => query
  );

export const timelineQueryByIdSelector = () =>
  createSelector(
    selectTimelineQuery,
    query => query
  );

export const globalSelector = () =>
  createSelector(
    selectGlobal,
    global => global
  );

export const getTimelineSelector = () =>
  createSelector(
    selectTimeline,
    timeline => timeline
  );
