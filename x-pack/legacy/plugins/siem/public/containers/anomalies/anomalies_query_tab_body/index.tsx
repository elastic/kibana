/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { EuiSpacer, EuiFlexGroup, EuiFlexItem, EuiLoadingSpinner } from '@elastic/eui';
import { AnomaliesQueryTabBodyProps } from './types';
import { manageQuery } from '../../../components/page/manage_query';
import { AnomaliesOverTimeHistogram } from '../../../components/anomalies_over_time';
import { AnomaliesOverTimeQuery } from '../anomalies_over_time';
import { getAnomaliesFilterQuery } from './utils';
import { useSiemJobs } from '../../../components/ml_popover/hooks/use_siem_jobs';
import { useKibanaUiSetting } from '../../../lib/settings/use_kibana_ui_setting';
import { DEFAULT_ANOMALY_SCORE } from '../../../../common/constants';

const AnomaliesOverTimeManage = manageQuery(AnomaliesOverTimeHistogram);

export const AnomaliesQueryTabBody = ({
  endDate,
  skip,
  startDate,
  type,
  narrowDateRange,
  filterQuery,
  anomaliesFilterQuery,
  setQuery,
  updateDateRange = () => {},
  AnomaliesTableComponent,
}: AnomaliesQueryTabBodyProps) => {
  const [siemJobsLoading, siemJobs] = useSiemJobs(true);
  const [anomalyScore] = useKibanaUiSetting(DEFAULT_ANOMALY_SCORE);

  if (siemJobsLoading) {
    return (
      <EuiFlexGroup justifyContent="center" alignItems="center">
        <EuiFlexItem grow={false}>
          <EuiSpacer size="xl" />
          <EuiLoadingSpinner size="xl" />
          <EuiSpacer size="xl" />
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }

  const mergedFilterQuery = getAnomaliesFilterQuery(
    filterQuery,
    anomaliesFilterQuery,
    siemJobs,
    anomalyScore
  );

  return (
    <>
      <AnomaliesOverTimeQuery
        endDate={endDate}
        filterQuery={mergedFilterQuery}
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
      <AnomaliesTableComponent
        startDate={startDate}
        endDate={endDate}
        skip={skip}
        type={type}
        narrowDateRange={narrowDateRange}
      />
    </>
  );
};

AnomaliesQueryTabBody.displayName = 'AnomaliesQueryTabBody';
