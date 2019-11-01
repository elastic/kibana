/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import moment from 'moment-timezone';

/**
 * Returns the timezone set on momentTime.
 * (UTC+offset) when offset if bigger than 0.
 * (UTC-offset) when offset if lower than 0.
 * @param momentTime Moment
 */
function formatTimezone(momentTime: moment.Moment) {
  const DEFAULT_TIMEZONE_FORMAT = 'Z';

  // Adds plus sign when offsetHours is greater than 0.
  const getCustomTimezoneFormat = (offsetHours: number) =>
    offsetHours > 0 ? `+${offsetHours}` : offsetHours;

  const utcOffsetHours = momentTime.utcOffset() / 60;

  const utcOffsetFormatted = Number.isInteger(utcOffsetHours)
    ? getCustomTimezoneFormat(utcOffsetHours)
    : DEFAULT_TIMEZONE_FORMAT;

  return momentTime.format(`(UTC${utcOffsetFormatted})`);
}

export type TimePrecision = 'hours' | 'minutes' | 'seconds' | 'milliseconds';
function getTimeFormat(precision: TimePrecision) {
  switch (precision) {
    case 'hours':
      return 'HH';
    case 'minutes':
      return 'HH:mm';
    case 'seconds':
      return 'HH:mm:ss';
    case 'milliseconds':
      return 'HH:mm:ss.SSS';
    default:
      return '';
  }
}

type DatePrecision = 'days' | 'months' | 'years';
function getDateFormat(precision: DatePrecision) {
  switch (precision) {
    case 'years':
      return 'YYYY';
    case 'months':
      return 'MMM YYYY';
    case 'days':
      return 'MMM D, YYYY';
    default:
      return '';
  }
}

function getFormatsAccordingToDateDifference(
  momentStart: moment.Moment,
  momentEnd: moment.Moment
) {
  const getDateDifference = (unitOfTime: DatePrecision | TimePrecision) =>
    momentEnd.diff(momentStart, unitOfTime);

  // Difference is greater than or equals to 5 years
  if (getDateDifference('years') >= 5) {
    return { dateFormat: getDateFormat('years') };
  }
  // Difference is greater than or equals to 5 months
  if (getDateDifference('months') >= 5) {
    return { dateFormat: getDateFormat('months') };
  }

  const dateFormat = getDateFormat('days');
  // Difference is greater than 1 day
  if (getDateDifference('days') > 1) {
    return { dateFormat };
  }

  // Difference is greater than or equals to 5 hours
  if (getDateDifference('hours') >= 5) {
    return { dateFormat, timeFormat: getTimeFormat('minutes') };
  }

  // Difference is greater than or equals to 5 minutes
  if (getDateDifference('minutes') >= 5) {
    return { dateFormat, timeFormat: getTimeFormat('seconds') };
  }

  // When difference is in milliseconds
  return { dateFormat, timeFormat: getTimeFormat('milliseconds') };
}

export function asAbsoluteTime({
  time,
  precision = 'milliseconds'
}: {
  time: number;
  precision?: TimePrecision;
}) {
  const momentTime = moment(time);
  const formattedTz = formatTimezone(momentTime);

  return momentTime.format(
    `${getDateFormat('days')}, ${getTimeFormat(precision)} ${formattedTz}`
  );
}

/**
 *
 * Returns the dates formatted according to the difference between the two dates:
 *
 * | Difference     |           Format                               |
 * | -------------- |:----------------------------------------------:|
 * | >= 5 years     | YYYY - YYYY                                    |
 * | >= 5 months    | MMM YYYY - MMM YYYY                            |
 * | > 1 day        | MMM D, YYYY                                    |
 * | >= 5 hours     | MMM D, YYYY, HH:mm - HH:mm (UTC)               |
 * | >= 5 minutes   | MMM D, YYYY, HH:mm:ss - HH:mm:ss (UTC)         |
 * | default        | MMM D, YYYY, HH:mm:ss.SSS - HH:mm:ss.SSS (UTC) |
 *
 * @param start timestamp
 * @param end timestamp
 */
export function asRelativeDateRange(start: number, end: number) {
  const momentStartTime = moment(start);
  const momentEndTime = moment(end);

  const { dateFormat, timeFormat } = getFormatsAccordingToDateDifference(
    momentStartTime,
    momentEndTime
  );

  if (timeFormat) {
    const formattedStartTime = momentStartTime.format(
      `${dateFormat}, ${timeFormat}`
    );
    const formattedEndTime = momentEndTime.format(timeFormat);
    const formattedTz = formatTimezone(momentStartTime);
    return `${formattedStartTime} - ${formattedEndTime} ${formattedTz}`;
  }

  const formattedStartTime = momentStartTime.format(dateFormat);
  const formattedEndTime = momentEndTime.format(dateFormat);
  return `${formattedStartTime} - ${formattedEndTime}`;
}
