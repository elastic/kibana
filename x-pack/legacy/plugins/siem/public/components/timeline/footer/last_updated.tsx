/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiIcon, EuiText, EuiToolTip } from '@elastic/eui';
import { FormattedRelative } from '@kbn/i18n/react';
import React, { useEffect, useState } from 'react';

import * as i18n from './translations';

interface LastUpdatedAtProps {
  compact?: boolean;
  updatedAt: number;
}

export const Updated = React.memo<{ date: number; prefix: string; updatedAt: number }>(
  ({ date, prefix, updatedAt }) => (
    <>
      {prefix}
      {
        <FormattedRelative
          key={`formatedRelative-${date}`}
          data-test-subj="last-updated-at-date"
          value={new Date(updatedAt)}
        />
      }
    </>
  )
);

Updated.displayName = 'Updated';

const prefix = ` ${i18n.UPDATED} `;

export const LastUpdatedAt = React.memo<LastUpdatedAtProps>(({ compact = false, updatedAt }) => {
  const [date, setDate] = useState(Date.now());

  function tick() {
    setDate(Date.now());
  }

  useEffect(() => {
    const timerID = setInterval(() => tick(), 10000);
    return () => {
      clearInterval(timerID);
    };
  }, []);

  return (
    <EuiToolTip
      content={
        <>
          <Updated date={date} prefix={prefix} updatedAt={updatedAt} />
        </>
      }
      data-test-subj="timeline-stream-tool-tip"
    >
      <EuiText size="s">
        <EuiIcon data-test-subj="last-updated-at-clock-icon" type="clock" />
        {!compact ? <Updated date={date} prefix={prefix} updatedAt={updatedAt} /> : null}
      </EuiText>
    </EuiToolTip>
  );
});

LastUpdatedAt.displayName = 'LastUpdatedAt';
