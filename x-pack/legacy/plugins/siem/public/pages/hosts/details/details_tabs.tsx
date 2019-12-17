/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useCallback } from 'react';
import { Route, Switch } from 'react-router-dom';

import { scoreIntervalToDateTime } from '../../../components/ml/score/score_interval_to_datetime';
import { Anomaly } from '../../../components/ml/types';
import { HostsTableType } from '../../../store/hosts/model';
import { AnomaliesQueryTabBody } from '../../../containers/anomalies/anomalies_query_tab_body';
import { AnomaliesHostTable } from '../../../components/ml/tables/anomalies_host_table';

import { HostDetailsTabsProps } from './types';
import { type } from './utils';

import {
  HostsQueryTabBody,
  AuthenticationsQueryTabBody,
  UncommonProcessQueryTabBody,
  EventsQueryTabBody,
  HostAlertsQueryTabBody,
} from '../navigation';

const HostDetailsTabs = React.memo<HostDetailsTabsProps>(
  ({
    defaultFilters,
    deleteQuery,
    filterQuery,
    from,
    isInitializing,
    detailName,
    setAbsoluteRangeDatePicker,
    setQuery,
    to,
    indexPattern,
    hostDetailsPagePath,
  }) => {
    const narrowDateRange = useCallback(
      (score: Anomaly, interval: string) => {
        const fromTo = scoreIntervalToDateTime(score, interval);
        setAbsoluteRangeDatePicker({
          id: 'global',
          from: fromTo.from,
          to: fromTo.to,
        });
      },
      [setAbsoluteRangeDatePicker, scoreIntervalToDateTime]
    );

    const updateDateRange = useCallback(
      (min: number, max: number) => {
        setAbsoluteRangeDatePicker({ id: 'global', from: min, to: max });
      },
      [setAbsoluteRangeDatePicker, scoreIntervalToDateTime]
    );

    const tabProps = {
      deleteQuery,
      endDate: to,
      filterQuery,
      skip: isInitializing,
      setQuery,
      startDate: from,
      type,
      indexPattern,
      hostName: detailName,
      narrowDateRange,
      updateDateRange,
    };

    return (
      <Switch>
        <Route
          path={`${hostDetailsPagePath}/:tabName(${HostsTableType.authentications})`}
          render={() => <AuthenticationsQueryTabBody {...tabProps} />}
        />
        <Route
          path={`${hostDetailsPagePath}/:tabName(${HostsTableType.hosts})`}
          render={() => <HostsQueryTabBody {...tabProps} />}
        />
        <Route
          path={`${hostDetailsPagePath}/:tabName(${HostsTableType.uncommonProcesses})`}
          render={() => <UncommonProcessQueryTabBody {...tabProps} />}
        />
        <Route
          path={`${hostDetailsPagePath}/:tabName(${HostsTableType.anomalies})`}
          render={() => (
            <AnomaliesQueryTabBody {...tabProps} AnomaliesTableComponent={AnomaliesHostTable} />
          )}
        />
        <Route
          path={`${hostDetailsPagePath}/:tabName(${HostsTableType.events})`}
          render={() => <EventsQueryTabBody {...tabProps} />}
        />
        <Route
          path={`${hostDetailsPagePath}/:tabName(${HostsTableType.alerts})`}
          render={() => <HostAlertsQueryTabBody {...tabProps} defaultFilters={defaultFilters} />}
        />
      </Switch>
    );
  }
);

HostDetailsTabs.displayName = 'HostDetailsTabs';

export { HostDetailsTabs };
