/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { EuiSpacer } from '@elastic/eui';
import { AnomaliesQueryTabBodyProps } from './types';
import { manageQuery } from '../../../components/page/manage_query';
import { AnomaliesHostTable } from '../../../components/ml/tables/anomalies_host_table';
import { AnomaliesOverTimeHistogram } from '../../../components/page/hosts/anomalies_over_time';
import { AnomaliesOverTimeQuery } from '../../../containers/anomalies/anomalies_over_time';

const AnomaliesOverTimeManage = manageQuery(AnomaliesOverTimeHistogram);

export const AnomaliesQueryTabBody = ({
  endDate,
  skip,
  startDate,
  type,
  narrowDateRange,
  hostName,
  setQuery,
  filterQuery,
  updateDateRange = () => {},
}: AnomaliesQueryTabBodyProps) => (
  <>
    <AnomaliesOverTimeQuery
      endDate={endDate}
      filterQuery={filterQuery}
      sourceId="default"
      startDate={startDate}
      type={type}
    >
      {({ anomaliesOverTime, loading, id, inspect, refetch, totalCount }) => (
        <AnomaliesOverTimeManage
          data={anomaliesOverTime!}
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
    </AnomaliesOverTimeQuery>
    <EuiSpacer size="l" />
    <AnomaliesHostTable
      startDate={startDate}
      endDate={endDate}
      skip={skip}
      type={type}
      hostName={hostName}
      narrowDateRange={narrowDateRange}
    />
  </>
);

AnomaliesQueryTabBody.displayName = 'AnomaliesQueryTabBody';
