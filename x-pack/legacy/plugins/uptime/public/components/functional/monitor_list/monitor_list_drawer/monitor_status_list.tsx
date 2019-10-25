/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useContext } from 'react';
import { get } from 'lodash';
import { EuiHealth, EuiSpacer } from '@elastic/eui';
import { Check } from '../../../../../common/graphql/types';
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

  const upChecks: string[] = [];
  const downChecks: string[] = [];

  checks.forEach((check: Check) => {
    const location = get<string>(check, 'observer.geo.name', 'unnamed-location');

    if (check.monitor.status === 'up') {
      upChecks.push(location);
    }
    if (check.monitor.status === 'down') {
      downChecks.push(location);
    }
  });

  const displayMonitorStatus = (checksList: string[], color: string, titleTxt: string) => {
    return (
      <>
        <EuiHealth color={color}>
          {titleTxt} in {checksList.map((location, index) => (index ? ', ' : '') + location)}
        </EuiHealth>
        <EuiSpacer size="s" />
      </>
    );
  };
  return (
    <>
      {downChecks.length > 0 && displayMonitorStatus(downChecks, danger, 'Down')}
      {upChecks.length > 0 && displayMonitorStatus(upChecks, success, 'Up')}
    </>
  );
};
