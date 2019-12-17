/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiFlexGroup, EuiFlexItem, EuiHealth, EuiLink } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import { get } from 'lodash';
import moment from 'moment';
import React, { useEffect } from 'react';
import { Ping } from '../../../../../common/graphql/types';
import { UptimeGraphQLQueryProps } from '../../../higher_order';
import { EmptyStatusBar } from './empty_status_bar';
import { convertMicrosecondsToMilliseconds } from '../../../../lib/helper';
import { MonitorSSLCertificate } from './monitor_ssl_certificate';
import * as labels from './translations';

interface MonitorStatusBarQueryResult {
  monitorStatus?: Ping;
}

interface MonitorStatusBarProps {
  monitorId: string;
  loadMonitorStatus: any;
}

type Props = MonitorStatusBarProps & UptimeGraphQLQueryProps<MonitorStatusBarQueryResult>;

export const MonitorStatusBarComponent = ({ data, monitorId, loadMonitorStatus }: Props) => {
  useEffect(() => {
    loadMonitorStatus();
  }, []);

  if (data?.monitorStatus) {
    const { monitor, timestamp, tls } = data.monitorStatus;
    const duration: number | undefined = get(monitor, 'duration.us', undefined);
    const status = get<'up' | 'down'>(monitor, 'status', 'down');
    const full = get<string>(data.monitorStatus, 'url.full');

    return (
      <>
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
          <EuiFlexItem grow={false}>
            <EuiFlexItem grow={false}>
              <EuiLink aria-label={labels.monitorUrlLinkAriaLabel} href={full} target="_blank">
                {full}
              </EuiLink>
            </EuiFlexItem>
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
  }
  return <EmptyStatusBar message={labels.loadingMessage} monitorId={monitorId} />;
};

// export const MonitorStatusBar = withUptimeGraphQL<
//   MonitorStatusBarQueryResult,
//   MonitorStatusBarProps
// >(MonitorStatusBarComponent, monitorStatusBarQuery);
