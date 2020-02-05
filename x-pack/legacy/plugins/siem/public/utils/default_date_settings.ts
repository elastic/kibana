/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import chrome from 'ui/chrome';
import dateMath from '@elastic/datemath';
import moment from 'moment';
import { isString, isBoolean, isNumber } from 'lodash/fp';
import {
  DEFAULT_SIEM_TIME_RANGE,
  DEFAULT_SIEM_REFRESH_INTERVAL,
  DEFAULT_FROM,
  DEFAULT_TO,
  DEFAULT_INTERVAL_TYPE,
  DEFAULT_INTERVAL_VALUE,
} from '../../common/constants';
import { Policy } from '../store/inputs/model';

interface DefaultTimeRange {
  from?: string | null;
  to?: string | null;
}

interface DefaultInterval {
  pause?: boolean | null;
  value?: number | null;
}

export type DefaultTimeRangeSetting = DefaultTimeRange | null | undefined;

export type DefaultIntervalSetting = DefaultInterval | null | undefined;

// Defaults for if everything fails including dateMath.parse(DEFAULT_FROM) or dateMath.parse(DEFAULT_TO)
// These should not really be hit unless we are in an extreme buggy state.
const DEFAULT_FROM_MOMENT = moment().subtract(24, 'hours');
const DEFAULT_TO_MOMENT = moment();

/**
 * Returns the default SIEM time range "from" string. This should be used only in
 * non-ReactJS code. For ReactJS code, use the settings context hook instead
 */
export const getDefaultFromString = (): string => {
  const defaultTimeRange: DefaultTimeRangeSetting = chrome
    .getUiSettingsClient()
    .get(DEFAULT_SIEM_TIME_RANGE);
  if (defaultTimeRange != null && isString(defaultTimeRange.from)) {
    return defaultTimeRange.from;
  } else {
    return DEFAULT_FROM;
  }
};

/**
 * Returns the default SIEM time range "to" string. This should be used only in
 * non-ReactJS code. For ReactJS code, use the settings context hook instead
 */
export const getDefaultToString = (): string => {
  const defaultTimeRange: DefaultTimeRangeSetting = chrome
    .getUiSettingsClient()
    .get(DEFAULT_SIEM_TIME_RANGE);
  if (defaultTimeRange != null && isString(defaultTimeRange.to)) {
    return defaultTimeRange.to;
  } else {
    return DEFAULT_TO;
  }
};

/**
 * Returns the default SIEM time range "from" Epoch. This should be used only in
 * non-ReactJS code. For ReactJS code, use the settings context hook instead
 */
export const getDefaultFromValue = (): number => getDefaultFromMoment().valueOf();

/**
 * Returns the default SIEM time range "from" moment. This should be used only in
 * non-ReactJS code. For ReactJS code, use the settings context hook instead
 */
export const getDefaultFromMoment = (): moment.Moment => {
  const defaultTimeRange: DefaultTimeRangeSetting = chrome
    .getUiSettingsClient()
    .get(DEFAULT_SIEM_TIME_RANGE);
  if (defaultTimeRange != null && isString(defaultTimeRange.from)) {
    return parseDateString(defaultTimeRange.from, DEFAULT_FROM, DEFAULT_FROM_MOMENT);
  } else {
    return parseDateWithDefault(DEFAULT_FROM, DEFAULT_FROM_MOMENT);
  }
};

/**
 * Returns the default SIEM time range "to" Epoch. This should be used only in
 * non-ReactJS code. For ReactJS code, use the settings context hook instead
 */
export const getDefaultToValue = (): number => getDefaultToMoment().valueOf();

/**
 * Returns the default SIEM time range "to" moment. This should be used only in
 * non-ReactJS code. For ReactJS code, use the settings context hook instead
 */
export const getDefaultToMoment = (): moment.Moment => {
  const defaultTimeRange: DefaultTimeRangeSetting = chrome
    .getUiSettingsClient()
    .get(DEFAULT_SIEM_TIME_RANGE);
  if (defaultTimeRange != null && isString(defaultTimeRange.to)) {
    return parseDateString(defaultTimeRange.to, DEFAULT_TO, DEFAULT_TO_MOMENT);
  } else {
    return parseDateWithDefault(DEFAULT_TO, DEFAULT_TO_MOMENT);
  }
};

/**
 * Returns the default SIEM interval "kind". This should be used only in
 * non-ReactJS code. For ReactJS code, use the settings context hook instead
 */
export const getDefaultIntervalKind = (): Policy['kind'] => {
  const defaultInterval: DefaultIntervalSetting = chrome
    .getUiSettingsClient()
    .get(DEFAULT_SIEM_REFRESH_INTERVAL);
  if (defaultInterval != null && isBoolean(defaultInterval.pause)) {
    return defaultInterval.pause ? 'manual' : 'interval';
  } else {
    return DEFAULT_INTERVAL_TYPE;
  }
};

/**
 * Returns the default SIEM interval "duration". This should be used only in
 * non-ReactJS code. For ReactJS code, use the settings context hook instead
 */
export const getDefaultIntervalDuration = (): Policy['duration'] => {
  const defaultInterval: DefaultIntervalSetting = chrome
    .getUiSettingsClient()
    .get(DEFAULT_SIEM_REFRESH_INTERVAL);
  if (defaultInterval != null && isNumber(defaultInterval.value)) {
    return defaultInterval.value;
  } else {
    return DEFAULT_INTERVAL_VALUE;
  }
};

export const parseDateString = (
  dateString: string | null | undefined,
  defaultDateString: string,
  defaultDate: moment.Moment
): moment.Moment => {
  if (dateString != null) {
    return parseDateWithDefault(dateString, defaultDate);
  } else {
    return parseDateWithDefault(defaultDateString, defaultDate);
  }
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
