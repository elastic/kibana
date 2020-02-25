/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiSpacer } from '@elastic/eui';
import React, { useContext, useState } from 'react';
import { useParams } from 'react-router-dom';
import { MonitorCharts, PingList } from '../components/functional';
import { UptimeRefreshContext, UptimeThemeContext } from '../contexts';
import { useUptimeTelemetry, useUrlParams, UptimePage } from '../hooks';
import { useTrackPageview } from '../../../../../plugins/observability/public';
import { MonitorStatusDetails } from '../components/connected';

export const MonitorPage = () => {
  // decode 64 base string, it was decoded to make it a valid url, since monitor id can be a url
  let { monitorId } = useParams();
  monitorId = atob(monitorId || '');

  const [pingListPageCount, setPingListPageCount] = useState<number>(10);
  const { colors } = useContext(UptimeThemeContext);
  const { refreshApp } = useContext(UptimeRefreshContext);
  const [getUrlParams, updateUrlParams] = useUrlParams();
  const { absoluteDateRangeStart, absoluteDateRangeEnd, ...params } = getUrlParams();
  const { dateRangeStart, dateRangeEnd, selectedPingStatus } = params;

  const [selectedLocation, setSelectedLocation] = useState(undefined);

  const sharedVariables = {
    dateRangeStart,
    dateRangeEnd,
    location: selectedLocation,
    monitorId,
  };

  useUptimeTelemetry(UptimePage.Monitor);

  useTrackPageview({ app: 'uptime', path: 'monitor' });
  useTrackPageview({ app: 'uptime', path: 'monitor', delay: 15000 });

  return (
    <>
      <EuiSpacer size="s" />
      <MonitorStatusDetails monitorId={monitorId} />
      <EuiSpacer size="s" />
      <MonitorCharts {...colors} monitorId={monitorId} variables={sharedVariables} />
      <EuiSpacer size="s" />
      <PingList
        onPageCountChange={setPingListPageCount}
        onSelectedLocationChange={setSelectedLocation}
        onSelectedStatusChange={(selectedStatus: string | undefined) => {
          updateUrlParams({ selectedPingStatus: selectedStatus || '' });
          refreshApp();
        }}
        pageSize={pingListPageCount}
        selectedOption={selectedPingStatus}
        selectedLocation={selectedLocation}
        variables={{
          ...sharedVariables,
          size: pingListPageCount,
          status: selectedPingStatus,
        }}
      />
    </>
  );
};
