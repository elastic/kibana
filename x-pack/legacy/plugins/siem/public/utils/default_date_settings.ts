/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import dateMath from '@elastic/datemath';
import moment from 'moment';
import { isBoolean, isNumber, isString } from 'lodash/fp';

import {
  DEFAULT_FROM,
  DEFAULT_TO,
  DEFAULT_INTERVAL_TYPE,
  DEFAULT_INTERVAL_VALUE,
} from '../../common/constants';
import { CoreStart } from '../plugin';
import { Policy } from '../store/inputs/model';
import { State, keys } from '../store/ui_settings/model';

// Defaults for if everything fails including dateMath.parse(DEFAULT_FROM) or dateMath.parse(DEFAULT_TO)
// These should not really be hit unless we are in an extreme buggy state.
const DEFAULT_FROM_MOMENT = moment().subtract(24, 'hours');
const DEFAULT_TO_MOMENT = moment();

/**
 * Retrieves timeRange settings to populate filters
 *
 * @param {CoreStart['uiSettings']} uiSettings Optional client to retrieve overriding UI settings
 */
export const getTimeRangeSettings = (uiSettings?: CoreStart['uiSettings']) => {
  const timeRange = uiSettings
    ? uiSettings.get<State['timeFilterRange']>(keys.timeFilterRange)
    : null;

  const fromStr = (isString(timeRange?.from) && timeRange?.from) || DEFAULT_FROM;
  const toStr = (isString(timeRange?.to) && timeRange?.to) || DEFAULT_TO;
  const from = parseDateWithDefault(fromStr, DEFAULT_FROM_MOMENT).valueOf();
  const to = parseDateWithDefault(toStr, DEFAULT_TO_MOMENT).valueOf();

  return { from, fromStr, to, toStr };
};

/**
 * Retrieves refreshInterval settings to populate filters
 *
 * @param {CoreStart['uiSettings']} uiSettings Optional client to retrieve overriding UI settings
 */
export const getIntervalSettings = (uiSettings?: CoreStart['uiSettings']): Policy => {
  const interval = uiSettings
    ? uiSettings.get<State['timeFilterRefreshInterval']>(keys.timeFilterRefreshInterval)
    : null;

  const duration = (isNumber(interval?.value) && interval?.value) || DEFAULT_INTERVAL_VALUE;
  const kind = isBoolean(interval?.pause) && !interval?.pause ? 'interval' : DEFAULT_INTERVAL_TYPE;

  return { kind, duration };
};

export const parseDateWithDefault = (
  dateString: string,
  defaultDate: moment.Moment
): moment.Moment => {
  const date = dateMath.parse(dateString);
  if (date != null && date.isValid()) {
    return date;
  } else {
    return defaultDate;
  }
};
