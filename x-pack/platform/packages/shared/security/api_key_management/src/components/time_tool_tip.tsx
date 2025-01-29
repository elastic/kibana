/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiToolTip } from '@elastic/eui';
import moment from 'moment';
import type { FunctionComponent } from 'react';
import React from 'react';

export interface TimeToolTipProps {
  timestamp: number;
}

export const TimeToolTip: FunctionComponent<React.PropsWithChildren<TimeToolTipProps>> = ({
  timestamp,
  children,
}) => {
  return (
    <EuiToolTip content={moment(timestamp).format('LLL')}>
      <span>{children ?? moment(timestamp).fromNow()}</span>
    </EuiToolTip>
  );
};
