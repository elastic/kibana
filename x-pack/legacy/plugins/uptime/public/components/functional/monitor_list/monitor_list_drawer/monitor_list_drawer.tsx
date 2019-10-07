/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useContext, useEffect } from 'react';
import {
  EuiHealth,
  EuiLink,
  EuiSpacer,
  EuiFlexGroup,
  EuiFlexItem,
  EuiButton,
  EuiIcon,
} from '@elastic/eui';
import { get } from 'lodash';
import styled from 'styled-components';
import { connect } from 'react-redux';
import { MonitorSummary, CheckMonitor } from '../../../../../common/graphql/types';
import { UptimeSettingsContext } from '../../../../contexts';
import { AppState } from '../../../../state';
import { fetchMonitorDetails } from '../../../../state/actions/monitor';
import { MostRecentError } from './most_recent_error';
import { getMonitorDetails } from '../../../../state/selectors';

const ContainerDiv = styled.div`
  padding: 10px;
  width: 100%;
`;

interface MonitorListDrawerProps {
  summary: MonitorSummary;
  monitorDetails: any;
  loadMonitorDetails: typeof fetchMonitorDetails;
}

/**
 * The elements shown when the user expands the monitor list rows.
 */

export function MonitorListDrawerComponent({
  summary,
  loadMonitorDetails,
  monitorDetails,
}: MonitorListDrawerProps) {
  if (!summary || !summary.state.checks) {
    return null;
  }
  useEffect(() => {
    loadMonitorDetails(summary.monitor_id);
  }, []);

  const monitorUrl: string | undefined = get(summary.state.url, 'full', undefined);
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
    <ContainerDiv>
      <EuiFlexGroup>
        <EuiFlexItem>
          <EuiLink href={monitorUrl}>
            {monitorUrl}
            <EuiIcon size="s" type="popout" color="subbdued" />
          </EuiLink>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButton size="s">Actions</EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="s" />
      {downLocations.length > 0 && displayMonitorStatus(downLocations, danger, 'Down')}
      {upLocations.length > 0 && displayMonitorStatus(upLocations, success, 'Up')}
      {monitorDetails && <MostRecentError error={monitorDetails.error} />}
    </ContainerDiv>
  );
}

const mapStateToProps = (state: AppState, { summary }: any) => ({
  monitorDetails: getMonitorDetails(state, summary),
});

const mapDispatchToProps = (dispatch: any) => ({
  loadMonitorDetails: (monitorId: string) => dispatch(fetchMonitorDetails(monitorId)),
});

export const MonitorListDrawer = connect(
  mapStateToProps,
  mapDispatchToProps
)(MonitorListDrawerComponent);
