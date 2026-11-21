/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiToolTip } from '@elastic/eui';
import { formatAbsoluteUtc, formatRelativeTime } from './formatters';
import { useNow } from './use_now';

export interface RelativeTimeProps {
  /** ISO timestamp. */
  value: string;
}

/** A relative time such as "6 h ago" whose tooltip shows the absolute UTC time. */
export const RelativeTime: React.FC<RelativeTimeProps> = ({ value }) => {
  const now = useNow();

  return (
    <EuiToolTip content={formatAbsoluteUtc(value)}>
      <time dateTime={value} tabIndex={0} data-test-subj="investigationRelativeTime">
        {formatRelativeTime(value, now)}
      </time>
    </EuiToolTip>
  );
};
RelativeTime.displayName = 'RelativeTime';
