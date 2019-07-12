/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { createSelector } from 'reselect';

import { getLogEntryAtTime } from '../utils/log_entry';
import { globalizeSelectors } from '../utils/typed_redux';
import {
  logFilterSelectors as localLogFilterSelectors,
  logPositionSelectors as localLogPositionSelectors,
  waffleFilterSelectors as localWaffleFilterSelectors,
  waffleOptionsSelectors as localWaffleOptionsSelectors,
  waffleTimeSelectors as localWaffleTimeSelectors,
} from './local';
import { State } from './reducer';
import { logEntriesSelectors as remoteLogEntriesSelectors } from './remote';

/**
 * local selectors
 */

const selectLocal = (state: State) => state.local;

export const logFilterSelectors = globalizeSelectors(selectLocal, localLogFilterSelectors);
export const logPositionSelectors = globalizeSelectors(selectLocal, localLogPositionSelectors);
export const waffleFilterSelectors = globalizeSelectors(selectLocal, localWaffleFilterSelectors);
export const waffleTimeSelectors = globalizeSelectors(selectLocal, localWaffleTimeSelectors);
export const waffleOptionsSelectors = globalizeSelectors(selectLocal, localWaffleOptionsSelectors);

/**
 * remote selectors
 */

const selectRemote = (state: State) => state.remote;

export const logEntriesSelectors = globalizeSelectors(selectRemote, remoteLogEntriesSelectors);

/**
 * shared selectors
 */

export const sharedSelectors = {
  selectFirstVisibleLogEntry: createSelector(
    logEntriesSelectors.selectEntries,
    logPositionSelectors.selectFirstVisiblePosition,
    (entries, firstVisiblePosition) =>
      firstVisiblePosition ? getLogEntryAtTime(entries, firstVisiblePosition) : null
  ),
  selectMiddleVisibleLogEntry: createSelector(
    logEntriesSelectors.selectEntries,
    logPositionSelectors.selectMiddleVisiblePosition,
    (entries, middleVisiblePosition) =>
      middleVisiblePosition ? getLogEntryAtTime(entries, middleVisiblePosition) : null
  ),
  selectLastVisibleLogEntry: createSelector(
    logEntriesSelectors.selectEntries,
    logPositionSelectors.selectLastVisiblePosition,
    (entries, lastVisiblePosition) =>
      lastVisiblePosition ? getLogEntryAtTime(entries, lastVisiblePosition) : null
  ),
};
