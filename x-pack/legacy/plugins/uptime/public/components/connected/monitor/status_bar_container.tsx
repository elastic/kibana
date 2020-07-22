/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useContext, useEffect } from 'react';
import { connect } from 'react-redux';
import { Dispatch } from 'redux';
import { AppState } from '../../../state';
import { monitorLocationsSelector, selectMonitorStatus } from '../../../state/selectors';
import { MonitorStatusBarComponent } from '../../functional/monitor_status_details/monitor_status_bar';
import { getMonitorStatusAction, getSelectedMonitorAction } from '../../../state/actions';
import { useUrlParams } from '../../../hooks';
import { Ping } from '../../../../common/graphql/types';
import { MonitorLocations } from '../../../../common/runtime_types/monitor';
import { UptimeRefreshContext } from '../../../contexts';

interface StateProps {
  monitorStatus: Ping;
  monitorLocations: MonitorLocations;
}

interface DispatchProps {
  loadMonitorStatus: typeof getMonitorStatusAction;
  loadSelectedMonitor: typeof getSelectedMonitorAction;
}

interface OwnProps {
  monitorId: string;
}

type Props = OwnProps & StateProps & DispatchProps;

const Container: React.FC<Props> = ({
  loadMonitorStatus,
  loadSelectedMonitor,
  monitorId,
  monitorStatus,
  monitorLocations,
}: Props) => {
  const { lastRefresh } = useContext(UptimeRefreshContext);

  const [getUrlParams] = useUrlParams();
  const { dateRangeStart: dateStart, dateRangeEnd: dateEnd } = getUrlParams();

  useEffect(() => {
    loadMonitorStatus({ dateStart, dateEnd, monitorId });
    loadSelectedMonitor({ monitorId });
  }, [monitorId, dateStart, dateEnd, loadMonitorStatus, lastRefresh, loadSelectedMonitor]);

  return (
    <MonitorStatusBarComponent
      monitorId={monitorId}
      monitorStatus={monitorStatus}
      monitorLocations={monitorLocations}
    />
  );
};

const mapStateToProps = (state: AppState, ownProps: OwnProps) => ({
  monitorStatus: selectMonitorStatus(state),
  monitorLocations: monitorLocationsSelector(state, ownProps.monitorId),
});

const mapDispatchToProps = (dispatch: Dispatch<any>): DispatchProps => ({
  loadSelectedMonitor: (params) => dispatch(getSelectedMonitorAction(params)),
  loadMonitorStatus: (params) => dispatch(getMonitorStatusAction(params)),
});

// @ts-ignore TODO: Investigate typescript issues here
export const MonitorStatusBar = connect<StateProps, DispatchProps, MonitorStatusBarProps>(
  // @ts-ignore TODO: Investigate typescript issues here
  mapStateToProps,
  mapDispatchToProps
)(Container);
