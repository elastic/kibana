/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { connect } from 'react-redux';
import { AppState } from '../../../state';
import { getMonitorLocations } from '../../../state/selectors';
import { fetchMonitorLocations } from '../../../state/actions/monitor';
import { MonitorStatusDetailsComponent } from './monitor_status_details';

const mapStateToProps = (state: AppState, { monitorId }: any) => ({
  monitorLocations: getMonitorLocations(state, monitorId),
});

const mapDispatchToProps = (dispatch: any, ownProps: any) => ({
  loadMonitorLocations: () => {
    const { dateStart, dateEnd, monitorId } = ownProps;
    dispatch(
      fetchMonitorLocations({
        monitorId,
        dateStart,
        dateEnd,
      })
    );
  },
});

export const MonitorStatusDetails = connect(
  mapStateToProps,
  mapDispatchToProps
)(MonitorStatusDetailsComponent);

export * from './monitor_status_details';
