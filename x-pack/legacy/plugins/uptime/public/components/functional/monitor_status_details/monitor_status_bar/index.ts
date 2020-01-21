/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { connect } from 'react-redux';
import { Dispatch } from 'redux';
import {
  StateProps,
  DispatchProps,
  MonitorStatusBarComponent,
  MonitorStatusBarProps,
} from './monitor_status_bar';
import { selectMonitorStatus, selectMonitorLocations } from '../../../../state/selectors';
import { AppState } from '../../../../state';
import { getMonitorStatus, getSelectedMonitor } from '../../../../state/actions';

const mapStateToProps = (state: AppState, ownProps: MonitorStatusBarProps) => ({
  monitorStatus: selectMonitorStatus(state),
  monitorLocations: selectMonitorLocations(state, ownProps.monitorId),
});

const mapDispatchToProps = (dispatch: Dispatch<any>, ownProps: MonitorStatusBarProps) => ({
  loadMonitorStatus: () => {
    const { dateStart, dateEnd, monitorId } = ownProps;
    dispatch(
      getMonitorStatus({
        monitorId,
        dateStart,
        dateEnd,
      })
    );
    dispatch(
      getSelectedMonitor({
        monitorId,
      })
    );
  },
});

// @ts-ignore TODO: Investigate typescript issues here
export const MonitorStatusBar = connect<StateProps, DispatchProps, MonitorStatusBarProps>(
  // @ts-ignore TODO: Investigate typescript issues here
  mapStateToProps,
  mapDispatchToProps
)(MonitorStatusBarComponent);

export { MonitorSSLCertificate } from './monitor_ssl_certificate';
export * from './monitor_status_bar';
