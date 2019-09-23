/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useContext } from 'react';
import {
  EuiText,
  EuiHealth,
  EuiLink,
  EuiSpacer,
  EuiFlexGroup,
  EuiFlexItem,
  EuiButton,
} from '@elastic/eui';
import { get } from 'lodash';
import styled from 'styled-components';
import { MonitorSummary, CheckMonitor } from '../../../../common/graphql/types';
import { toCondensedCheck } from './to_condensed_check';
import { CondensedCheckList } from './condensed_check_list';
import { CLIENT_DEFAULTS } from '../../../../common/constants';
import { UptimeSettingsContext } from '../../../contexts';

const ContainerDiv = styled.div`
  padding: 10px;
`;

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
  const displayMonitorStatus = (locations: CheckMonitor[], color: string) => {
    return (
      <>
        <EuiText size="s">
          <EuiHealth color={color} />
          Up in{' '}
          {locations.map((location, index) => (index ? ', ' : '') + (location.name || location.ip))}
        </EuiText>
        <EuiSpacer size="s" />
      </>
    );
  };
  if (summary.state.checks.length < CLIENT_DEFAULTS.CONDENSED_CHECK_LIMIT) {
    const monitorUrl: string | undefined = get(summary.state.url, 'full', undefined);

    return (
      <ContainerDiv>
        <EuiFlexGroup>
          <EuiFlexItem>
            <EuiLink href={monitorUrl}>{monitorUrl}</EuiLink>
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiButton size="s">Actions</EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiSpacer size="s" />
        {downLocations.length > 0 && displayMonitorStatus(downLocations, danger)}
        {upLocations.length > 0 && displayMonitorStatus(upLocations, success)}
      </ContainerDiv>
    );
  } else {
    return <CondensedCheckList condensedChecks={toCondensedCheck(summary.state.checks)} />;
  }
};
