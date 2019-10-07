/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useContext } from 'react';
import { EuiHealth, EuiSpacer } from '@elastic/eui';
import { CheckMonitor, Check } from '../../../../../common/graphql/types';
import { UptimeSettingsContext } from '../../../../contexts';

interface MonitorStatusListProps {
  /**
   * Recent List of checks performed on monitor
   */
  checks: Check[];
}

export const MonitorStatusList = ({ checks }: MonitorStatusListProps) => {
  const {
    colors: { success, danger },
  } = useContext(UptimeSettingsContext);

  const upLocations: CheckMonitor[] = [];
  const downLocations: CheckMonitor[] = [];

  checks.forEach((check: Check) => {
    if (check.monitor.status === 'up') {
      upLocations.push(check.monitor);
    }
    if (check.monitor.status === 'down') {
      downLocations.push(check.monitor);
    }
  });
  const displayMonitorStatus = (locations: CheckMonitor[], color: string, titleTxt: string) => {
    return (
      <>
        <EuiHealth color={color}>
          {titleTxt} in{' '}
          {locations.map((location, index) => (index ? ', ' : '') + (location.name || location.ip))}
        </EuiHealth>
        <EuiSpacer size="s" />
      </>
    );
  };
  return (
    <>
      {downLocations.length > 0 && displayMonitorStatus(downLocations, danger, 'Down')}
      {upLocations.length > 0 && displayMonitorStatus(upLocations, success, 'Up')}
    </>
  );
};
