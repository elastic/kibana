/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';
import { EuiToolTip } from '@elastic/eui';
import moment from 'moment-timezone';
import {
  asAbsoluteTime,
  TimePrecision
} from '../../../utils/datetime_formatters';

interface Props {
  /**
   * timestamp in milliseconds
   */
  time: number;
  precision?: TimePrecision;
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
