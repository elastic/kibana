/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiLink, EuiTitle, EuiTextColor, EuiSpacer } from '@elastic/eui';
import React, { useEffect } from 'react';
import { MonitorSSLCertificate } from './monitor_ssl_certificate';
import * as labels from './translations';
import { StatusByLocations } from './status_by_location';
import { Ping } from '../../../../../common/graphql/types';
import { MonitorLocations } from '../../../../../common/runtime_types';
import { MostRecentCheck } from './most_recent_check';

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

  const monitor = monitorStatus?.monitor;
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
      <MostRecentCheck timestamp={monitorStatus?.timestamp} duration={duration} status={status} />
      <MonitorSSLCertificate tls={monitorStatus?.tls} />
    </>
  );
};
