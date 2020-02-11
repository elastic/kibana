/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { reducerWithInitialState } from 'typescript-fsa-reducers';

import { CoreStart } from '../../plugin';
import { Keys, State } from './model';

export type UiSettingsState = State;

export const initialUiSettingsState = {
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
  timeFilterQuickRanges: [
    {
      from: 'now/d',
      to: 'now/d',
      display: 'Today',
    },
  ],
  timeFilterRefreshInterval: {},
  timeFilterRange: {},
  timeZone: 'UTC',
};

export const createInitialUiSettingsState = (
  uiSettings: CoreStart['uiSettings']
): UiSettingsState => ({
  bytesFormat: uiSettings.get<State['bytesFormat']>(Keys.bytesFormat),
  darkMode: uiSettings.get<State['darkMode']>(Keys.darkMode),
  dateFormat: uiSettings.get<State['dateFormat']>(Keys.dateFormat),
  indexPattern: uiSettings.get<State['indexPattern']>(Keys.indexPattern),
  newsFeedEnabled: uiSettings.get<State['newsFeedEnabled']>(Keys.newsFeedEnabled),
  newsFeedUrl: uiSettings.get<State['newsFeedUrl']>(Keys.newsFeedUrl),
  timeFilterQuickRanges: uiSettings.get<State['timeFilterQuickRanges']>(Keys.timeFilterQuickRanges),
  timeFilterRefreshInterval: uiSettings.get<State['timeFilterRefreshInterval']>(
    Keys.timeFilterRefreshInterval
  ),
  timeFilterRange: uiSettings.get<State['timeFilterRange']>(Keys.timeFilterRange),
  timeZone: uiSettings.get<State['timeZone']>(Keys.timeZone),
});

export const uiSettingsReducer = reducerWithInitialState(initialUiSettingsState).build();
