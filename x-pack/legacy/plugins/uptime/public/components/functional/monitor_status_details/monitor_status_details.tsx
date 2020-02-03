/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useContext, useEffect, useState } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiPanel } from '@elastic/eui';
import styled from 'styled-components';
import { LocationMap } from '../location_map';
import { MonitorStatusBar } from './monitor_status_bar';
import { UptimeRefreshContext } from '../../../contexts';

interface MonitorStatusBarProps {
  monitorId: string;
  variables: any;
  loadMonitorLocations: any;
  monitorLocations: any;
  dateStart: any;
  dateEnd: any;
}

const WrapFlexItem = styled(EuiFlexItem)`
  @media (max-width: 1150px) {
    width: 100%;
  }
`;

export const MonitorStatusDetailsComponent = ({
  monitorId,
  variables,
  loadMonitorLocations,
  monitorLocations,
  dateStart,
  dateEnd,
}: MonitorStatusBarProps) => {
  useEffect(() => {
    loadMonitorLocations(monitorId);
  }, [loadMonitorLocations, monitorId, dateStart, dateEnd]);
  const { refreshApp } = useContext(UptimeRefreshContext);

  const [isTabActive] = useState(document.visibilityState);
  const onTabActive = () => {
    if (document.visibilityState === 'visible' && isTabActive === 'hidden') {
      refreshApp();
    }
  };

  // Refreshing application state after Tab becomes active to render latest map state
  // If application renders in when tab is not in focus it gives some unexpected behaviors
  // Where map is not visible on change
  useEffect(() => {
    document.addEventListener('visibilitychange', onTabActive);
    return () => {
      document.removeEventListener('visibilitychange', onTabActive);
    };

    // we want this effect to execute exactly once after the component mounts
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <EuiPanel>
      <EuiFlexGroup gutterSize="l" wrap responsive={true}>
        <EuiFlexItem grow={true}>
          <MonitorStatusBar
            monitorId={monitorId}
            variables={variables}
            dateStart={dateStart}
            dateEnd={dateEnd}
          />
        </EuiFlexItem>
        <WrapFlexItem grow={false}>
          <LocationMap monitorLocations={monitorLocations} />
        </WrapFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
};
