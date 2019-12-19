/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { connect } from 'react-redux';
import { MonitorStatusBarComponent } from './monitor_status_bar';
import { selectMonitorStatus } from '../../../../state/selectors';
import { AppState } from '../../../../state';
import { getMonitorStatus } from '../../../../state/actions';

const mapStateToProps = (state: AppState) => ({
  monitorStatus: selectMonitorStatus(state),
});

const mapDispatchToProps = (dispatch: any, ownProps: any) => ({
  loadMonitorStatus: () => {
    const { dateStart, dateEnd, monitorId, location } = ownProps;
    dispatch(
      getMonitorStatus({
        monitorId,
        dateStart,
        dateEnd,
        location,
      })
    );
  },
});

export const MonitorStatusBar = connect(
  mapStateToProps,
  mapDispatchToProps
)(MonitorStatusBarComponent);

export { MonitorSSLCertificate } from './monitor_ssl_certificate';
export * from './monitor_status_bar';
