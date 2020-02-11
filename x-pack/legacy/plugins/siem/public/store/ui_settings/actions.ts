/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import actionCreatorFactory from 'typescript-fsa';

import { State } from './model';

const actionCreator = actionCreatorFactory('x-pack/siem/local/ui_settings');

export const anomalyThresholdChanged = actionCreator<State['anomalyThreshold']>(
  'ANOMALY_THRESHOLD_CHANGED'
);
export const bytesFormatChanged = actionCreator<State['bytesFormat']>('BYTES_FORMAT_CHANGED');
export const darkModeChanged = actionCreator<State['darkMode']>('DARK_MODE_CHANGED');
export const dateFormatChanged = actionCreator<State['dateFormat']>('DATE_FORMAT_CHANGED');
export const indexPatternChanged = actionCreator<State['indexPattern']>('INDEX_PATTERN_CHANGED');
export const newsFeedEnabledChanged = actionCreator<State['newsFeedEnabled']>(
  'NEWS_FEED_ENABLED_CHANGED'
);
export const newsFeedUrlChanged = actionCreator<State['newsFeedUrl']>('NEWS_FEED_URL_CHANGED');
export const numberFormatChanged = actionCreator<State['numberFormat']>('NUMBER_FORMAT_CHANGED');
export const timeFilterQuickRangesChanged = actionCreator<State['timeFilterQuickRanges']>(
  'TIME_FILTER_QUICK_RANGES_CHANGED'
);
export const timeFilterRangeChanged = actionCreator<State['timeFilterRange']>(
  'TIME_FILTER_RANGE_CHANGED'
);
export const timeFilterRefreshIntervalChanged = actionCreator<State['timeFilterRefreshInterval']>(
  'TIME_FILTER_REFRESH_INTERVAL_CHANGED'
);
export const timeZoneChanged = actionCreator<State['timeZone']>('TIME_ZONE_CHANGED');
