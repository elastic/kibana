/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useContext, useEffect } from 'react';
import { connect } from 'react-redux';
import { Dispatch } from 'redux';
import { useGetUrlParams } from '../../../hooks';
import { AppState } from '../../../state';
import { monitorLocationsSelector } from '../../../state/selectors';
import { getMonitorLocationsAction, MonitorLocationsPayload } from '../../../state/actions/monitor';
import { MonitorStatusDetailsComponent } from '../../functional/monitor_status_details';
import { MonitorLocations } from '../../../../common/runtime_types';
import { UptimeRefreshContext } from '../../../contexts';

interface OwnProps {
  monitorId: string;
}

interface StoreProps {
  monitorLocations: MonitorLocations;
}

interface DispatchProps {
  loadMonitorLocations: typeof getMonitorLocationsAction;
}

type Props = OwnProps & StoreProps & DispatchProps;

export const Container: React.FC<Props> = ({
  loadMonitorLocations,
  monitorLocations,
  monitorId,
}: Props) => {
  const { lastRefresh } = useContext(UptimeRefreshContext);

  const { dateRangeStart: dateStart, dateRangeEnd: dateEnd } = useGetUrlParams();

  useEffect(() => {
    loadMonitorLocations({ dateStart, dateEnd, monitorId });
  }, [loadMonitorLocations, monitorId, dateStart, dateEnd, lastRefresh]);

  return (
    <MonitorStatusDetailsComponent monitorId={monitorId} monitorLocations={monitorLocations} />
  );
};
const mapStateToProps = (state: AppState, { monitorId }: OwnProps) => ({
  monitorLocations: monitorLocationsSelector(state, monitorId),
});

const mapDispatchToProps = (dispatch: Dispatch<any>) => ({
  loadMonitorLocations: (params: MonitorLocationsPayload) => {
    dispatch(getMonitorLocationsAction(params));
  },
});

export const MonitorStatusDetails = connect<StoreProps, DispatchProps, OwnProps>(
  // @ts-ignore TODO: Investigate typescript issues here
  mapStateToProps,
  mapDispatchToProps
)(Container);
