/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useContext } from 'react';
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
import { MonitorSummary, CheckMonitor } from '../../../../common/graphql/types';
import { UptimeSettingsContext } from '../../../contexts';
import { AppState } from '../../../state';
import { fetchMonitorDetails, MonitorDetailsRequest } from '../../../state/actions/monitor';

const ContainerDiv = styled.div`
  padding: 10px;
  width: 100%;
`;

interface MonitorListDrawerProps {
  summary?: MonitorSummary;
  loadMonitorDetails: typeof fetchMonitorDetails;
}

/**
 * The elements shown when the user expands the monitor list rows.
 */
export const MonitorListDrawerComponent = ({
  summary,
  loadMonitorDetails,
}: MonitorListDrawerProps) => {
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

  const checkGroup: string = get(summary, 'state.checks[0].agent.id');
  loadMonitorDetails({
    checkGroup,
    monitorId: summary.monitor_id,
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
  const monitorUrl: string | undefined = get(summary.state.url, 'full', undefined);

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
    </ContainerDiv>
  );
};

const mapStateToProps = (state: AppState) => ({
  // monitorDetails: getMonitorDetails(state),
});

const mapDispatchToProps = (dispatch: any) => ({
  loadMonitorDetails: (data: MonitorDetailsRequest) => dispatch(fetchMonitorDetails(data)),
});

export const MonitorListDrawer = connect(
  mapStateToProps,
  mapDispatchToProps
)(MonitorListDrawerComponent);
