/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useEffect } from 'react';
import { connect } from 'react-redux';
import { AppState } from '../../../state';
import { getMonitorDetails } from '../../../state/selectors';
import { MonitorDetailsActionPayload } from '../../../state/actions/types';
import { fetchMonitorDetails } from '../../../state/actions/monitor';
import { MonitorListDrawerComponent } from '../../functional/monitor_list/monitor_list_drawer/monitor_list_drawer';
import { useUrlParams } from '../../../hooks';
import { MonitorSummary } from '../../../../common/graphql/types';
import { MonitorDetails } from '../../../../common/runtime_types/monitor';

interface ContainerProps {
  summary: MonitorSummary;
  monitorDetails: MonitorDetails;
  loadMonitorDetails: typeof fetchMonitorDetails;
}

const Container: React.FC<ContainerProps> = ({ summary, loadMonitorDetails, monitorDetails }) => {
  const monitorId = summary?.monitor_id;

  const [getUrlParams] = useUrlParams();
  const { dateRangeStart: dateStart, dateRangeEnd: dateEnd } = getUrlParams();

  useEffect(() => {
    loadMonitorDetails({
      dateStart,
      dateEnd,
      monitorId,
    });
  }, [dateStart, dateEnd, monitorId, loadMonitorDetails]);
  return <MonitorListDrawerComponent monitorDetails={monitorDetails} summary={summary} />;
};

const mapStateToProps = (state: AppState, { summary }: any) => ({
  monitorDetails: getMonitorDetails(state, summary),
});

const mapDispatchToProps = (dispatch: any) => ({
  loadMonitorDetails: (actionPayload: MonitorDetailsActionPayload) =>
    dispatch(fetchMonitorDetails(actionPayload)),
});

export const MonitorListDrawer = connect(mapStateToProps, mapDispatchToProps)(Container);
