/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiSpacer } from '@elastic/eui';
import React from 'react';
import { useSelector } from 'react-redux';
import { useTrackPageview } from '../../../../../plugins/observability/public';
import { monitorStatusSelector } from '../state/selectors';
import { PageHeader } from './page_header';
import { useBreadcrumbs } from '../hooks/use_breadcrumbs';
import { useMonitorId, useUptimeTelemetry, UptimePage } from '../hooks';
import { MonitorCharts } from '../components/monitor';
import { MonitorStatusDetails } from '../components/monitor';
import { PingList } from '../components/monitor';

export const MonitorPage: React.FC = () => {
  const monitorId = useMonitorId();

  const selectedMonitor = useSelector(monitorStatusSelector);

  useUptimeTelemetry(UptimePage.Monitor);

  useTrackPageview({ app: 'uptime', path: 'monitor' });
  useTrackPageview({ app: 'uptime', path: 'monitor', delay: 15000 });

  const nameOrId = selectedMonitor?.monitor?.name || monitorId || '';
  useBreadcrumbs([{ text: nameOrId }]);
  return (
    <>
      <PageHeader headingText={nameOrId} datePicker={true} />
      <EuiSpacer size="s" />
      <MonitorStatusDetails monitorId={monitorId} />
      <EuiSpacer size="s" />
      <MonitorCharts monitorId={monitorId} />
      <EuiSpacer size="s" />
      <PingList monitorId={monitorId} />
    </>
  );
};
