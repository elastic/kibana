/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useContext } from 'react';
import { EuiText, EuiHealth, EuiLink } from '@elastic/eui';
import { MonitorSummary, CheckMonitor } from '../../../../common/graphql/types';
import { CheckList } from './check_list';
import { toCondensedCheck } from './to_condensed_check';
import { CondensedCheckList } from './condensed_check_list';
import { CLIENT_DEFAULTS } from '../../../../common/constants';
import { UptimeSettingsContext } from '../../../contexts';

interface MonitorListDrawerProps {
  summary?: MonitorSummary;
}

/**
 * The elements shown when the user expands the monitor list rows.
 */
export const MonitorListDrawer = ({ summary }: MonitorListDrawerProps) => {
  const {
    colors: { success, danger },
  } = useContext(UptimeSettingsContext);
  if (!summary || !summary.state.checks) {
    return null;
  }
  const upLocations: CheckMonitor[] = [];
  const downLocations: CheckMonitor[] = [];
  summary.state.checks.forEach(check => {
    if (check.monitor.status === 'up') {
      upLocations.push(check.monitor);
    }
    if (check.monitor.status === 'down') {
      downLocations.push(check.monitor);
    }
  });
  if (summary.state.checks.length < CLIENT_DEFAULTS.CONDENSED_CHECK_LIMIT) {
    return (
      <>
        <EuiLink>{summary.state.url.full}</EuiLink>
        <EuiText>
          <EuiHealth color={danger} />
          Down in {upLocations.map(location => (location.name || location.ip) + ',')}
        </EuiText>
        <EuiText>
          <EuiHealth color={success} />
          Up in {upLocations.map(location => (location.name || location.ip) + ',')}
        </EuiText>
        <CheckList checks={summary.state.checks} />
      </>
    );
  } else {
    return <CondensedCheckList condensedChecks={toCondensedCheck(summary.state.checks)} />;
  }
};
