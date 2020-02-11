/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { reducerWithInitialState } from 'typescript-fsa-reducers';

import { CoreStart } from '../../plugin';
import * as actions from './actions';
import { keys, State } from './model';

export type UiSettingsState = State;

export const initialUiSettingsState: UiSettingsState = {
  anomalyThreshold: 50,
  bytesFormat: '0,0.[0]b',
  darkMode: false,
  dateFormat: 'MMM D, YYYY @ HH:mm:ss.SSS',
  indexPattern: [
    'apm-*-transaction*',
    'auditbeat-*',
    'endgame-*',
    'filebeat-*',
    'packetbeat-*',
    'winlogbeat-*',
  ],
  newsFeedEnabled: true,
  newsFeedUrl: 'https://feeds.elastic.co/security-solution',
  numberFormat: '0,0.[000]',
  timeFilterQuickRanges: [
    {
      from: 'now/d',
      to: 'now/d',
      display: 'Today',
    },
  ],
  timeFilterRange: {},
  timeFilterRefreshInterval: {},
  timeZone: 'UTC',
};

export const createInitialUiSettingsState = (
  uiSettings: CoreStart['uiSettings']
): UiSettingsState => ({
  anomalyThreshold: uiSettings.get<State['anomalyThreshold']>(keys.anomalyThreshold),
  bytesFormat: uiSettings.get<State['bytesFormat']>(keys.bytesFormat),
  darkMode: uiSettings.get<State['darkMode']>(keys.darkMode),
  dateFormat: uiSettings.get<State['dateFormat']>(keys.dateFormat),
  indexPattern: uiSettings.get<State['indexPattern']>(keys.indexPattern),
  newsFeedEnabled: uiSettings.get<State['newsFeedEnabled']>(keys.newsFeedEnabled),
  newsFeedUrl: uiSettings.get<State['newsFeedUrl']>(keys.newsFeedUrl),
  numberFormat: uiSettings.get<State['numberFormat']>(keys.numberFormat),
  timeFilterQuickRanges: uiSettings.get<State['timeFilterQuickRanges']>(keys.timeFilterQuickRanges),
  timeFilterRange: uiSettings.get<State['timeFilterRange']>(keys.timeFilterRange),
  timeFilterRefreshInterval: uiSettings.get<State['timeFilterRefreshInterval']>(
    keys.timeFilterRefreshInterval
  ),
  timeZone: uiSettings.get<State['timeZone']>(keys.timeZone),
});

export const uiSettingsReducer = reducerWithInitialState(initialUiSettingsState)
  .case(actions.anomalyThresholdChanged, (state, anomalyThreshold) => ({
    ...state,
    anomalyThreshold,
  }))
  .case(actions.bytesFormatChanged, (state, bytesFormat) => ({
    ...state,
    bytesFormat,
  }))
  .case(actions.darkModeChanged, (state, darkMode) => ({
    ...state,
    darkMode,
  }))
  .case(actions.dateFormatChanged, (state, dateFormat) => ({
    ...state,
    dateFormat,
  }))
  .case(actions.indexPatternChanged, (state, indexPattern) => ({
    ...state,
    indexPattern,
  }))
  .case(actions.newsFeedEnabledChanged, (state, newsFeedEnabled) => ({
    ...state,
    newsFeedEnabled,
  }))
  .case(actions.newsFeedUrlChanged, (state, newsFeedUrl) => ({
    ...state,
    newsFeedUrl,
  }))
  .case(actions.numberFormatChanged, (state, numberFormat) => ({
    ...state,
    numberFormat,
  }))
  .case(actions.timeFilterQuickRangesChanged, (state, timeFilterQuickRanges) => ({
    ...state,
    timeFilterQuickRanges,
  }))
  .case(actions.timeFilterRefreshIntervalChanged, (state, timeFilterRefreshInterval) => ({
    ...state,
    timeFilterRefreshInterval,
  }))
  .case(actions.timeFilterRangeChanged, (state, timeFilterRange) => ({
    ...state,
    timeFilterRange,
  }))
  .case(actions.timeZoneChanged, (state, timeZone) => ({
    ...state,
    timeZone,
  }))
  .build();
