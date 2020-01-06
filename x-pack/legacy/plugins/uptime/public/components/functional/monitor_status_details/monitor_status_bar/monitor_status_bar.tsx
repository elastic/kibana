/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiHealth,
  EuiLink,
  EuiText,
  EuiTitle,
  EuiTextColor,
  EuiSpacer,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import moment from 'moment';
import React, { useEffect } from 'react';
import { convertMicrosecondsToMilliseconds } from '../../../../lib/helper';
import { MonitorSSLCertificate } from './monitor_ssl_certificate';
import * as labels from './translations';
import { StatusByLocations } from './status_by_location';
import { Ping } from '../../../../../common/graphql/types';
import { MonitorLocations } from '../../../../../common/runtime_types';

interface MonitorStatusBarProps {
  monitorId: string;
  loadMonitorStatus?: any;
  dateStart: string;
  dateEnd: string;
  monitorStatus: Ping;
  monitorLocations: MonitorLocations;
}

export const MonitorStatusBarComponent = ({
  dateStart,
  dateEnd,
  monitorId,
  loadMonitorStatus,
  monitorStatus,
  monitorLocations,
}: MonitorStatusBarProps) => {
  useEffect(() => {
    loadMonitorStatus();
  }, [dateStart, dateEnd, loadMonitorStatus]);

  if (monitorStatus) {
    const { monitor, timestamp, tls } = monitorStatus;
    const duration: number | undefined = monitor?.duration?.us;
    const status = monitor?.status ?? 'down';
    const full = monitorStatus?.url?.full ?? '';

    return (
      <>
        <StatusByLocations locations={monitorLocations?.locations ?? []} />
        <EuiLink aria-label={labels.monitorUrlLinkAriaLabel} href={full} target="_blank">
          {full}
        </EuiLink>
        <EuiTitle size="xs">
          <EuiTextColor color="subdued">
            <h1 data-test-subj="monitor-page-title">{monitorId}</h1>
          </EuiTextColor>
        </EuiTitle>
        <EuiSpacer />
        <EuiText>
          <h5>Most Recent Check:</h5>
        </EuiText>
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
        <MonitorSSLCertificate tls={tls} />
      </>
    );
  } else {
    return null;
  }
};
