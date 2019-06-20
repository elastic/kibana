/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import moment from 'moment';

import { getEmptyValue } from '../empty_value';

import * as i18n from './translations';

/** one millisecond (as nanoseconds) */
export const ONE_MILLISECOND_AS_NANOSECONDS = 1000000;

export const ONE_SECOND = 1000;
export const ONE_MINUTE = 60000;
export const ONE_HOUR = 3600000;
export const ONE_DAY = 86400000; // ms
export const ONE_MONTH = 2592000000; // ms
export const ONE_YEAR = 31536000000; // ms

const milliseconds = (duration: moment.Duration): string =>
  Number.isInteger(duration.milliseconds())
    ? `${duration.milliseconds()}ms`
    : `${duration.milliseconds().toFixed(6)}ms`; // nanosecond precision
const seconds = (duration: moment.Duration): string =>
  `${duration.seconds().toFixed()}s${
    duration.milliseconds() > 0 ? ` ${milliseconds(duration)}` : ''
  }`;
const minutes = (duration: moment.Duration): string =>
  `${duration.minutes()}m ${seconds(duration)}`;
const hours = (duration: moment.Duration): string => `${duration.hours()}h ${minutes(duration)}`;
const days = (duration: moment.Duration): string => `${duration.days()}d ${hours(duration)}`;
const months = (duration: moment.Duration): string =>
  `${duration.years() > 0 || duration.months() > 0 ? `${duration.months()}m ` : ''}${days(
    duration
  )}`;
const years = (duration: moment.Duration): string =>
  `${duration.years() > 0 ? `${duration.years()}y ` : ''}${months(duration)}`;

export const getFormattedDurationString = (
  maybeDurationNanoseconds: string | number | object | undefined | null
): string => {
  const totalNanoseconds = Number(maybeDurationNanoseconds);

  if (maybeDurationNanoseconds == null) {
    return getEmptyValue();
  }

  if (Number.isNaN(totalNanoseconds) || totalNanoseconds < 0) {
    return `${maybeDurationNanoseconds}`; // echo back the duration as a string
  }

  if (totalNanoseconds < ONE_MILLISECOND_AS_NANOSECONDS) {
    return `${totalNanoseconds}ns`; // display the raw nanoseconds
  }

  const duration = moment.duration(totalNanoseconds / ONE_MILLISECOND_AS_NANOSECONDS);
  const totalMs = duration.asMilliseconds();

  if (totalMs < ONE_SECOND) {
    return milliseconds(duration);
  } else if (totalMs < ONE_MINUTE) {
    return seconds(duration);
  } else if (totalMs < ONE_HOUR) {
    return minutes(duration);
  } else if (totalMs < ONE_DAY) {
    return hours(duration);
  } else if (totalMs < ONE_MONTH) {
    return days(duration);
  } else if (totalMs < ONE_YEAR) {
    return months(duration);
  } else {
    return years(duration);
  }
};

export const getHumanizedDuration = (
  maybeDurationNanoseconds: string | number | object | undefined | null
): string => {
  if (maybeDurationNanoseconds == null) {
    return i18n.NO_DURATION;
  }

  const totalNanoseconds = Number(maybeDurationNanoseconds);

  if (Number.isNaN(totalNanoseconds) || totalNanoseconds < 0) {
    return i18n.INVALID_DURATION;
  }

  if (totalNanoseconds === 0) {
    return i18n.ZERO_NANOSECONDS;
  } else if (totalNanoseconds === 1) {
    return i18n.A_NANOSECOND;
  } else if (totalNanoseconds < ONE_MILLISECOND_AS_NANOSECONDS) {
    return i18n.A_FEW_NANOSECONDS;
  } else if (totalNanoseconds === ONE_MILLISECOND_AS_NANOSECONDS) {
    return i18n.A_MILLISECOND;
  }

  const totalMs = totalNanoseconds / ONE_MILLISECOND_AS_NANOSECONDS;
  if (totalMs < ONE_SECOND) {
    return i18n.A_FEW_MILLISECONDS;
  } else if (totalMs === ONE_SECOND) {
    return i18n.A_SECOND;
  } else {
    return moment.duration(totalMs).humanize();
  }
};
