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
  endTime?: number;
  precision?: 'days' | 'minutes' | 'seconds' | 'milliseconds';
}

function getPreciseTime(
  precision: Props['precision'],
  separator: string = ','
) {
  switch (precision) {
    case 'days':
      return '';
    case 'minutes':
      return `${separator} HH:mm`;
    case 'seconds':
      return `${separator} HH:mm:ss`;
    default:
      return `${separator} HH:mm:ss.SSS`;
  }
}

function withLeadingPlus(value: number) {
  return value > 0 ? `+${value}` : value;
}

export function asAbsoluteTime({
  time,
  endTime,
  precision = 'milliseconds'
}: Props) {
  const momentTime = moment(time);
  const utcOffsetHours = momentTime.utcOffset() / 60;
  const utcOffsetFormatted = Number.isInteger(utcOffsetHours)
    ? withLeadingPlus(utcOffsetHours)
    : 'Z';

  let format = `MMM D, YYYY${getPreciseTime(precision)}`;

  if (endTime) {
    const formattedEndTime = moment(endTime).format(
      getPreciseTime(precision, '-')
    );
    format = `${format} ${formattedEndTime}`;
  }

  return momentTime.format(`${format} (UTC${utcOffsetFormatted})`);
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
