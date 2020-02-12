/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { State } from '../reducer';

export const getAnomalyThreshold = (state: State) => state.uiSettings.anomalyThreshold;
export const getBytesFormat = (state: State) => state.uiSettings.bytesFormat;
export const getDarkMode = (state: State) => state.uiSettings.darkMode;
export const getDateFormat = (state: State) => state.uiSettings.dateFormat;
export const getIndexPattern = (state: State) => state.uiSettings.indexPattern;
export const getNewsFeedEnabled = (state: State) => state.uiSettings.newsFeedEnabled;
export const getNewsFeedUrl = (state: State) => state.uiSettings.newsFeedUrl;
export const getNumberFormat = (state: State) => state.uiSettings.numberFormat;
export const getTimeFilterQuickRanges = (state: State) => state.uiSettings.timeFilterQuickRanges;
export const getTimeFilterRange = (state: State) => state.uiSettings.timeFilterRange;
export const getTimeFilterRefreshInterval = (state: State) =>
  state.uiSettings.timeFilterRefreshInterval;
export const getTimeZone = (state: State) => state.uiSettings.timeZone;
