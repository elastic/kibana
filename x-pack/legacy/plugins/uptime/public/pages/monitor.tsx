/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiSpacer } from '@elastic/eui';
import React, { useContext, useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { connect, MapDispatchToPropsFunction, MapStateToPropsParam } from 'react-redux';
import { MonitorCharts, PingList } from '../components/functional';
import { UptimeRefreshContext } from '../contexts';
import { useUptimeTelemetry, useUrlParams, UptimePage } from '../hooks';
import { useTrackPageview } from '../../../../../plugins/observability/public';
import { MonitorStatusDetails } from '../components/connected';
import { Ping } from '../../common/graphql/types';
import { AppState } from '../state';
import { selectSelectedMonitor } from '../state/selectors';
import { getSelectedMonitorAction } from '../state/actions';
import { PageHeader } from './page_header';
import { useBreadcrumbs } from '../hooks/use_breadcrumbs';

interface StateProps {
  selectedMonitor: Ping | null;
}

interface DispatchProps {
  dispatchGetMonitorStatus: (monitorId: string) => void;
}

type Props = StateProps & DispatchProps;

export const MonitorPageComponent: React.FC<Props> = ({
  selectedMonitor,
  dispatchGetMonitorStatus,
}: Props) => {
  // decode 64 base string, it was decoded to make it a valid url, since monitor id can be a url
  let { monitorId } = useParams();
  monitorId = atob(monitorId || '');

  useEffect(() => {
    if (monitorId) {
      dispatchGetMonitorStatus(monitorId);
    }
  }, [dispatchGetMonitorStatus, monitorId]);

  const [pingListPageCount, setPingListPageCount] = useState<number>(10);
  const { refreshApp } = useContext(UptimeRefreshContext);
  const [getUrlParams, updateUrlParams] = useUrlParams();
  const { absoluteDateRangeStart, absoluteDateRangeEnd, ...params } = getUrlParams();
  const { dateRangeStart, dateRangeEnd, selectedPingStatus } = params;

  const [selectedLocation, setSelectedLocation] = useState(undefined);
  const [pingListIndex, setPingListIndex] = useState(0);

  const sharedVariables = {
    dateRangeStart,
    dateRangeEnd,
    location: selectedLocation,
    monitorId,
  };

  useUptimeTelemetry(UptimePage.Monitor);

  useTrackPageview({ app: 'uptime', path: 'monitor' });
  useTrackPageview({ app: 'uptime', path: 'monitor', delay: 15000 });

  const nameOrId = selectedMonitor?.monitor?.name || selectedMonitor?.monitor?.id || '';
  useBreadcrumbs([{ text: nameOrId }]);
  return (
    <>
      <PageHeader headingText={nameOrId} datePicker={true} />
      <EuiSpacer size="s" />
      <MonitorStatusDetails monitorId={monitorId} />
      <EuiSpacer size="s" />
      <MonitorCharts monitorId={monitorId} />
      <EuiSpacer size="s" />
      <PingList
        onPageCountChange={setPingListPageCount}
        onSelectedLocationChange={setSelectedLocation}
        onSelectedStatusChange={(selectedStatus: string | undefined) => {
          updateUrlParams({ selectedPingStatus: selectedStatus || '' });
          refreshApp();
        }}
        onPageIndexChange={(index: number) => setPingListIndex(index)}
        pageIndex={pingListIndex}
        pageSize={pingListPageCount}
        selectedOption={selectedPingStatus}
        selectedLocation={selectedLocation}
        variables={{
          ...sharedVariables,
          page: pingListIndex,
          size: pingListPageCount,
          status: selectedPingStatus,
        }}
      />
    </>
  );
};

const mapStateToProps: MapStateToPropsParam<StateProps, {}, AppState> = (state) => ({
  selectedMonitor: selectSelectedMonitor(state),
});

const mapDispatchToProps: MapDispatchToPropsFunction<DispatchProps, {}> = (dispatch, own) => {
  return {
    dispatchGetMonitorStatus: (monitorId: string) => {
      dispatch(
        getSelectedMonitorAction({
          monitorId,
        })
      );
    },
  };
};

export const MonitorPage = connect(mapStateToProps, mapDispatchToProps)(MonitorPageComponent);
