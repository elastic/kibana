/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';
import { EuiToolTip } from '@elastic/eui';
import moment from 'moment-timezone';

const DEFAULT_TIMEZONE_FORMAT = 'Z';

interface Props {
  /**
   * timestamp in milliseconds
   */
  time: number;
  precision?: 'days' | 'minutes' | 'seconds' | 'milliseconds';
}

function getTimeFormat(
  precision: Props['precision'],
  withSeparator: boolean = true
) {
  const separator = withSeparator ? ', ' : '';
  switch (precision) {
    case 'days':
      return '';
    case 'minutes':
      return `${separator}HH:mm`;
    case 'seconds':
      return `${separator}HH:mm:ss`;
    default:
      return `${separator}HH:mm:ss.SSS`;
  }
}

/**
 * Adds plus sign when offsetHours is greater than 0.
 * offsetHours = 2 -> returns: +2
 * offsetHours = 0 - > returns: 0
 * @param offsetHours
 */
function getCustomTimezoneFormat(offsetHours: number) {
  return offsetHours > 0 ? `+${offsetHours}` : offsetHours;
}

/**
 * Returns the timezone set on momentTime.
 * (UTC+offset) when offset if bigger than 0.
 * (UTC-offset) when offset if lower than 0.
 * @param momentTime Moment
 */
function formatTimezone(momentTime: moment.Moment) {
  const utcOffsetHours = momentTime.utcOffset() / 60;

  const utcOffsetFormatted = Number.isInteger(utcOffsetHours)
    ? getCustomTimezoneFormat(utcOffsetHours)
    : DEFAULT_TIMEZONE_FORMAT;

  return momentTime.format(`(UTC${utcOffsetFormatted})`);
}

export function asAbsoluteTime({ time, precision = 'milliseconds' }: Props) {
  const momentTime = moment(time);
  const formattedTz = formatTimezone(momentTime);

  return momentTime.format(
    `MMM D, YYYY${getTimeFormat(precision)} ${formattedTz}`
  );
}

/**
 *
 * Format start and end times returning a formatted value based on the precision time:
 *
 * | precision time |           returned value                         |
 * | -------------- |:------------------------------------------------:|
 * | minutes        | MMM D, YYYY, 00:00 - 01:00 (UTC+1)               |
 * | seconds        | MMM D, YYYY, 00:00:00 - 01:00:00 (UTC+1)         |
 * | milliseconds   | MMM D, YYYY, 00:00:00.000 - 01:00:00.000 (UTC+1) |
 *
 * @param start timestamp
 * @param end timestamp
 * @param precision 'minutes' | 'seconds' | 'milliseconds'
 */
export function asRelativeDateRange(
  start: number,
  end: number,
  precision: Exclude<Props['precision'], 'days'>
) {
  const timeFormat = getTimeFormat(precision, false);

  const momentStartTime = moment(start);
  const momentEndTime = moment(end);

  const formattedTz = formatTimezone(momentStartTime);

  const formattedStartTime = momentStartTime.format(
    `MMM D, YYYY, ${timeFormat}`
  );
  const formattedEndTime = momentEndTime.format(timeFormat);

  return `${formattedStartTime} - ${formattedEndTime} ${formattedTz}`;
}

export function TimestampTooltip({ time, precision = 'milliseconds' }: Props) {
  const momentTime = moment(time);
  const relativeTimeLabel = momentTime.fromNow();
  const absoluteTimeLabel = asAbsoluteTime({ time, precision });

  return (
    <EuiToolTip content={absoluteTimeLabel}>
      <>{relativeTimeLabel}</>
    </EuiToolTip>
  );
}
