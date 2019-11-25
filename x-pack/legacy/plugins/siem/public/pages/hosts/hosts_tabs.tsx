/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { memo } from 'react';
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

const HostsTabs = memo<HostsTabsProps>(
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
      narrowDateRange: (score: Anomaly, interval: string) => {
        const fromTo = scoreIntervalToDateTime(score, interval);
        setAbsoluteRangeDatePicker({
          id: 'global',
          from: fromTo.from,
          to: fromTo.to,
        });
      },
      updateDateRange: (min: number, max: number) => {
        setAbsoluteRangeDatePicker({ id: 'global', from: min, to: max });
      },
    };

    return (
      <Switch>
        <Route
          path={`${hostsPagePath}/:tabName(${HostsTableType.hosts})`}
          render={() => <HostsQueryTabBody {...tabProps} />}
        />
        <Route
          path={`${hostsPagePath}/:tabName(${HostsTableType.authentications})`}
          render={() => <AuthenticationsQueryTabBody {...tabProps} />}
        />
        <Route
          path={`${hostsPagePath}/:tabName(${HostsTableType.uncommonProcesses})`}
          render={() => <UncommonProcessQueryTabBody {...tabProps} />}
        />
        <Route
          path={`${hostsPagePath}/:tabName(${HostsTableType.anomalies})`}
          render={() => (
            <AnomaliesQueryTabBody {...tabProps} AnomaliesTableComponent={AnomaliesHostTable} />
          )}
        />
        <Route
          path={`${hostsPagePath}/:tabName(${HostsTableType.events})`}
          render={() => <EventsQueryTabBody {...tabProps} />}
        />
      </Switch>
    );
  }
);

HostsTabs.displayName = 'HostsTabs';

export { HostsTabs };
