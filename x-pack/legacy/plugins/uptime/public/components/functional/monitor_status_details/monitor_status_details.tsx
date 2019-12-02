/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { connect } from 'react-redux';
import { EuiFlexGroup, EuiFlexItem, EuiPanel } from '@elastic/eui';
import { LocationMap } from '../location_map';
import { MonitorStatusBar } from '../monitor_status_bar';
import { AppState } from '../../../state';
import { getMonitorLocations } from '../../../state/selectors';
import { fetchMonitorLocations } from '../../../state/actions/monitor';

interface MonitorStatusBarProps {
  monitorId: string;
  variables: any;
}

export const MonitorStatusDetailsComponent = ({ monitorId, variables }: MonitorStatusBarProps) => {
  return (
    <EuiPanel>
      <EuiFlexGroup gutterSize="l" wrap>
        <EuiFlexItem grow={true}>
          <MonitorStatusBar monitorId={monitorId} variables={variables} />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <LocationMap monitorId={monitorId} />
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
};

const mapStateToProps = (state: AppState, { monitorId }: any) => ({
  monitorLocations: getMonitorLocations(state, monitorId),
});

const mapDispatchToProps = (dispatch: any) => ({
  loadMonitorLocations: (monitorId: string) => dispatch(fetchMonitorLocations(monitorId)),
});

export const MonitorStatusDetails = connect(
  mapStateToProps,
  mapDispatchToProps
)(MonitorStatusDetailsComponent);
