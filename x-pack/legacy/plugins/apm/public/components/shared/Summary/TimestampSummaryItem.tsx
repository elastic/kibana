/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';
import { EuiToolTip } from '@elastic/eui';
import moment from 'moment-timezone';

interface Props {
  time: number;
}

const TimestampSummaryItem = (props: Props) => {
  const time = moment.tz(props.time, moment.tz.guess());
  const relativeTimeLabel = time.fromNow();
  const absoluteTimeLabel = time.format('MMM Do YYYY HH:mm:ss.SSS zz');

  return (
    <EuiToolTip content={absoluteTimeLabel}>
      <>{relativeTimeLabel}</>
    </EuiToolTip>
  );
};

export { TimestampSummaryItem };
