/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiFlexGroup, EuiFlexItem, EuiHealth, EuiText, EuiSpacer } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import moment from 'moment';
import React from 'react';
import { convertMicrosecondsToMilliseconds } from '../../../../lib/helper';
import * as labels from './translations';

interface MostRecentCheckProps {
  timestamp: string;
  duration: number | undefined;
  status: string;
}

export const MostRecentCheck = ({ timestamp, duration, status }: MostRecentCheckProps) => {
  if (!timestamp || !status || !duration) {
    return (
      <EuiText>
        <h5>
          <FormattedMessage
            id="xpack.uptime.monitorStatusBar.mostRecentCheck.notAvailable"
            defaultMessage="No recent check available in this duration."
          />
        </h5>
      </EuiText>
    );
  }

  return (
    <>
      <EuiText>
        <h5>
          <FormattedMessage
            id="xpack.uptime.monitorStatusBar.mostRecentCheck.label"
            defaultMessage="Most Recent Check:"
          />
        </h5>
      </EuiText>
      <EuiSpacer size="s" />
      <EuiFlexGroup gutterSize="l" wrap>
        <EuiFlexItem grow={false}>
          <EuiHealth
            aria-label={labels.healthStatusMessageAriaLabel}
            color={status === 'up' ? 'success' : 'danger'}
            style={{ lineHeight: 'inherit' }}
          >
            {status === 'up' ? labels.upLabel : labels.downLabel}
          </EuiHealth>
        </EuiFlexItem>
        {!!duration && (
          <EuiFlexItem aria-label={labels.durationTextAriaLabel} grow={false}>
            <FormattedMessage
              id="xpack.uptime.monitorStatusBar.healthStatus.durationInMillisecondsMessage"
              values={{ duration: convertMicrosecondsToMilliseconds(duration) }}
              defaultMessage="{duration}ms"
              description="The 'ms' is an abbreviation for 'milliseconds'."
            />
          </EuiFlexItem>
        )}
        <EuiFlexItem aria-label={labels.timestampFromNowTextAriaLabel} grow={true}>
          {moment(new Date(timestamp).valueOf()).fromNow()}
        </EuiFlexItem>
      </EuiFlexGroup>
    </>
  );
};
