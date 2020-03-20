/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useEffect } from 'react';
import { AnomaliesQueryTabBodyProps } from './types';
import { getAnomaliesFilterQuery } from './utils';
import { useSiemJobs } from '../../../components/ml_popover/hooks/use_siem_jobs';
import { useUiSetting$ } from '../../../lib/kibana';
import { DEFAULT_ANOMALY_SCORE } from '../../../../common/constants';
import { MatrixHistogramContainer } from '../../../components/matrix_histogram';
import { histogramConfigs } from './histogram_configs';
const ID = 'anomaliesOverTimeQuery';

export const AnomaliesQueryTabBody = ({
  deleteQuery,
  endDate,
  setQuery,
  skip,
  startDate,
  type,
  narrowDateRange,
  filterQuery,
  anomaliesFilterQuery,
  AnomaliesTableComponent,
  flowTarget,
  ip,
}: AnomaliesQueryTabBodyProps) => {
  useEffect(() => {
    return () => {
      if (deleteQuery) {
        deleteQuery({ id: ID });
      }
    };
  }, []);

  const [, siemJobs] = useSiemJobs(true);
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
        endDate={endDate}
        filterQuery={mergedFilterQuery}
        id={ID}
        setQuery={setQuery}
        sourceId="default"
        startDate={startDate}
        type={type}
        {...histogramConfigs}
      />
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
