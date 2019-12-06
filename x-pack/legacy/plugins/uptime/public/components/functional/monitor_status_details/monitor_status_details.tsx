/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useEffect } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiPanel } from '@elastic/eui';
import { LocationMap } from '../location_map';
import { MonitorStatusBar } from '../monitor_status_bar';

interface MonitorStatusBarProps {
  monitorId: string;
  variables: any;
  loadMonitorLocations: any;
  monitorLocations: any;
  dateStart: any;
  dateEnd: any;
}

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
  }, [monitorId, dateStart, dateEnd]);

  return (
    <EuiPanel>
      <EuiFlexGroup gutterSize="l" wrap>
        <EuiFlexItem grow={true}>
          <MonitorStatusBar monitorId={monitorId} variables={variables} />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <LocationMap monitorLocations={monitorLocations} />
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
};
