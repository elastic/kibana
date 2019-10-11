/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiIcon, EuiLoadingSpinner, EuiToolTip } from '@elastic/eui';
import { FormattedMessage, FormattedRelative } from '@kbn/i18n/react';
import React, { memo } from 'react';

import { LastEventIndexKey } from '../../graphql/types';
import { useLastEventTimeQuery } from '../../containers/events/last_event_time';
import { getEmptyTagValue } from '../empty_value';

export interface LastEventTimeProps {
  hostName?: string;
  indexKey: LastEventIndexKey;
  ip?: string;
}
export const LastEventTime = memo<LastEventTimeProps>(({ hostName, indexKey, ip }) => {
  const { loading, lastSeen, errorMessage } = useLastEventTimeQuery(
    indexKey,
    { hostName, ip },
    'default'
  );

  if (errorMessage != null) {
    return (
      <EuiToolTip
        position="top"
        content={errorMessage}
        data-test-subj="last_event_time_error"
        aria-label="last_event_time_error"
        id={`last_event_time_error-${indexKey}`}
      >
        <EuiIcon aria-describedby={`last_event_time_error-${indexKey}`} type="alert" />
      </EuiToolTip>
    );
  }
  return (
    <>
      {loading && <EuiLoadingSpinner size="m" />}
      {!loading && lastSeen != null && new Date(lastSeen).toString() === 'Invalid Date'
        ? lastSeen
        : !loading &&
          lastSeen != null && (
            <EuiToolTip data-test-subj="last_event_time" position="bottom" content={lastSeen}>
              <FormattedMessage
                id="xpack.siem.headerPage.pageSubtitle"
                defaultMessage="Last event: {beat}"
                values={{
                  beat: <FormattedRelative value={new Date(lastSeen)} />,
                }}
              />
            </EuiToolTip>
          )}
      {!loading && lastSeen == null && getEmptyTagValue()}
    </>
  );
});

LastEventTime.displayName = 'LastEventTime';
