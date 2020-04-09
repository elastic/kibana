/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { memo, useCallback } from 'react';
import { Route, Switch } from 'react-router-dom';

import { HostsTabsProps } from './types';
import { scoreIntervalToDateTime } from '../../components/ml/score/score_interval_to_datetime';
import { Anomaly } from '../../components/ml/types';
import { HostsTableType } from '../../store/hosts/model';
import { AnomaliesQueryTabBody } from '../../containers/anomalies/anomalies_query_tab_body';
import { AnomaliesHostTable } from '../../components/ml/tables/anomalies_host_table';

import {
  HostsQueryTabBody,
  AuthenticationsQueryTabBody,
  UncommonProcessQueryTabBody,
  EventsQueryTabBody,
} from './navigation';
import { HostAlertsQueryTabBody } from './navigation/alerts_query_tab_body';

export const HostsTabs = memo<HostsTabsProps>(
  ({
    deleteQuery,
    filterQuery,
    setAbsoluteRangeDatePicker,
    to,
    from,
    setQuery,
    isInitializing,
    type,
    indexPattern,
    hostsPagePath,
  }) => {
    const tabProps = {
      deleteQuery,
      endDate: to,
      filterQuery,
      skip: isInitializing,
      setQuery,
      startDate: from,
      type,
      indexPattern,
      narrowDateRange: useCallback(
        (score: Anomaly, interval: string) => {
          const fromTo = scoreIntervalToDateTime(score, interval);
          setAbsoluteRangeDatePicker({
            id: 'global',
            from: fromTo.from,
            to: fromTo.to,
          });
        },
        [setAbsoluteRangeDatePicker]
      ),
      updateDateRange: useCallback(
        (min: number, max: number) => {
          setAbsoluteRangeDatePicker({ id: 'global', from: min, to: max });
        },
        [setAbsoluteRangeDatePicker]
      ),
    };

    return (
      <Switch>
        <Route path={`${hostsPagePath}/:tabName(${HostsTableType.hosts})`}>
          <HostsQueryTabBody {...tabProps} />
        </Route>
        <Route path={`${hostsPagePath}/:tabName(${HostsTableType.authentications})`}>
          <AuthenticationsQueryTabBody {...tabProps} />
        </Route>
        <Route path={`${hostsPagePath}/:tabName(${HostsTableType.uncommonProcesses})`}>
          <UncommonProcessQueryTabBody {...tabProps} />
        </Route>
        <Route path={`${hostsPagePath}/:tabName(${HostsTableType.anomalies})`}>
          <AnomaliesQueryTabBody {...tabProps} AnomaliesTableComponent={AnomaliesHostTable} />
        </Route>
        <Route path={`${hostsPagePath}/:tabName(${HostsTableType.events})`}>
          <EventsQueryTabBody {...tabProps} />
        </Route>
        <Route path={`${hostsPagePath}/:tabName(${HostsTableType.alerts})`}>
          <HostAlertsQueryTabBody {...tabProps} />
        </Route>
      </Switch>
    );
  }
);

HostsTabs.displayName = 'HostsTabs';
