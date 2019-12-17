/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { noop } from 'lodash/fp';
import React from 'react';

import { EuiSpacer } from '@elastic/eui';
import { manageQuery } from '../page/manage_query';
import { AlertsOverTimeHistogram } from '../page/hosts/alerts_over_time';
import { AlertsComponentsQueryProps } from './types';
import { AlertsOverTimeQuery } from '../../containers/alerts/alerts_over_time';
import { hostsModel } from '../../store/model';
import { AlertsTable } from './alerts_table';

const AlertsOverTimeManage = manageQuery(AlertsOverTimeHistogram);
export const AlertsView = ({
  deleteQuery,
  endDate,
  filterQuery,
  pageFilters,
  skip,
  setQuery,
  startDate,
  type,
  updateDateRange = noop,
}: AlertsComponentsQueryProps) => (
  <>
    <AlertsOverTimeQuery
      endDate={endDate}
      filterQuery={filterQuery}
      sourceId="default"
      startDate={startDate}
      type={hostsModel.HostsType.page}
    >
      {({ alertsOverTime, loading, id, inspect, refetch, totalCount }) => (
        <AlertsOverTimeManage
          data={alertsOverTime!}
          endDate={endDate}
          id={id}
          inspect={inspect}
          loading={loading}
          refetch={refetch}
          setQuery={setQuery}
          startDate={startDate}
          totalCount={totalCount}
          updateDateRange={updateDateRange}
        />
      )}
    </AlertsOverTimeQuery>
    <EuiSpacer size="l" />
    <AlertsTable endDate={endDate} startDate={startDate} pageFilters={pageFilters} />
  </>
);

AlertsView.displayName = 'AlertsView';
