/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { EuiSpacer } from '@elastic/eui';
import gql from 'graphql-tag';
import { AnomaliesQueryTabBodyProps } from './types';
import { getAnomaliesFilterQuery } from './utils';
import { useSiemJobs } from '../../../components/ml_popover/hooks/use_siem_jobs';
import { useUiSetting$ } from '../../../lib/kibana';
import { DEFAULT_ANOMALY_SCORE } from '../../../../common/constants';
import { MatrixHistogramContainer } from '../../matrix_histogram';
import { SignalsHistogramOption } from '../../../components/matrix_histogram/types';
import { getMatrixHistogramQuery } from '../../helpers';

const ID = 'anomaliesOverTimeQuery';
const anomaliesStackByOptions: SignalsHistogramOption[] = [
  {
    text: 'job',
    value: 'job_id',
  },
];
const AnomaliesOverTimeGqlQuery = gql`
  ${getMatrixHistogramQuery('Anomalies')}
`;
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
  flowTarget,
  ip,
}: AnomaliesQueryTabBodyProps) => {
  const [siemJobsLoading, siemJobs] = useSiemJobs(true);
  const [anomalyScore] = useUiSetting$<number>(DEFAULT_ANOMALY_SCORE);

  const mergedFilterQuery = getAnomaliesFilterQuery(
    filterQuery,
    anomaliesFilterQuery,
    siemJobs,
    anomalyScore,
    flowTarget,
    ip
  );

  return (
    <>
      <MatrixHistogramContainer
        dataKey="Anomalies"
        defaultStackByOption={anomaliesStackByOptions[0]}
        endDate={endDate}
        filterQuery={mergedFilterQuery}
        hideHistogramIfEmpty={true}
        id={ID}
        query={AnomaliesOverTimeGqlQuery}
        sourceId="default"
        stackByOptions={anomaliesStackByOptions}
        startDate={startDate}
        title="Anomalies"
        updateDateRange={updateDateRange}
      />
      <EuiSpacer />
      <AnomaliesTableComponent
        startDate={startDate}
        endDate={endDate}
        skip={skip}
        type={type as never}
        narrowDateRange={narrowDateRange}
        flowTarget={flowTarget}
        ip={ip}
      />
    </>
  );
};

AnomaliesQueryTabBody.displayName = 'AnomaliesQueryTabBody';
