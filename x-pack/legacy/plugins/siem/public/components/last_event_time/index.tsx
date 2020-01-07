/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiIcon, EuiLoadingSpinner, EuiToolTip } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import React, { memo } from 'react';

import { LastEventIndexKey } from '../../graphql/types';
import { useLastEventTimeQuery } from '../../containers/events/last_event_time';
import { getEmptyTagValue } from '../empty_value';
import { FormattedRelativePreferenceDate } from '../formatted_date';

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
        aria-label="last_event_time_error"
        content={errorMessage}
        data-test-subj="last_event_time_error"
        id={`last_event_time_error-${indexKey}`}
        position="top"
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
            <FormattedMessage
              defaultMessage="Last event: {beat}"
              id="xpack.siem.headerPage.pageSubtitle"
              values={{
                beat: <FormattedRelativePreferenceDate value={lastSeen} />,
              }}
            />
          )}
      {!loading && lastSeen == null && getEmptyTagValue()}
    </>
  );
});

LastEventTime.displayName = 'LastEventTime';
