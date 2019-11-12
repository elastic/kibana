/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';
import { EuiToolTip } from '@elastic/eui';
import moment from 'moment-timezone';

interface Props {
  /**
   * timestamp in milliseconds
   */
  time: number;
  precision?: 'days' | 'minutes' | 'seconds' | 'milliseconds';
}

function getPreciseTime(precision: Props['precision']) {
  switch (precision) {
    case 'days':
      return '';
    case 'minutes':
      return ', HH:mm';
    case 'seconds':
      return ', HH:mm:ss';
    default:
      return ', HH:mm:ss.SSS';
  }
}

function withLeadingPlus(value: number) {
  return value > 0 ? `+${value}` : value;
}

export function asAbsoluteTime({ time, precision = 'milliseconds' }: Props) {
  const momentTime = moment(time);
  const utcOffsetHours = momentTime.utcOffset() / 60;
  const utcOffsetFormatted = Number.isInteger(utcOffsetHours)
    ? withLeadingPlus(utcOffsetHours)
    : 'Z';

  return momentTime.format(
    `MMM D, YYYY${getPreciseTime(precision)} (UTC${utcOffsetFormatted})`
  );
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
