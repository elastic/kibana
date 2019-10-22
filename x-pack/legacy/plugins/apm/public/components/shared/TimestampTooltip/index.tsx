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
  precision?: 'days' | 'minutes' | 'milliseconds';
}

function getPreciseTime(precision: Props['precision']) {
  switch (precision) {
    case 'days':
      return '';
    case 'minutes':
      return ', HH:mm';
    default:
      return ', HH:mm:ss.SSS';
  }
}

export function TimestampTooltip({ time, precision = 'milliseconds' }: Props) {
  const momentTime = moment(time);
  const relativeTimeLabel = momentTime.fromNow();
  const absoluteTimeLabel = momentTime.format(
    `MMM Do YYYY${getPreciseTime(precision)} (ZZ zz)`
  );

  return (
    <EuiToolTip content={absoluteTimeLabel}>
      <>{relativeTimeLabel}</>
    </EuiToolTip>
  );
}
