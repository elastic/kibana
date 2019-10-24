/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC, Fragment, useState, useEffect } from 'react';
import { EuiSpacer, EuiLoadingSpinner, EuiPanel } from '@elastic/eui';
import { ml } from '../../../../../services/ml_api_service';
import { DataFrameAnalyticsConfig } from '../../../../common';
import { EvaluatePanel } from './evaluate_panel';
import { ResultsTable } from './results_table';

interface GetDataFrameAnalyticsResponse {
  count: number;
  data_frame_analytics: DataFrameAnalyticsConfig[];
}

const LoadingPanel: FC = () => (
  <EuiPanel>
    <EuiLoadingSpinner className="mlRegressionExploration__evaluateLoadingSpinner" size="xl" />
  </EuiPanel>
);

interface Props {
  jobId: string;
}

export const RegressionExploration: FC<Props> = ({ jobId }) => {
  const [jobConfig, setJobConfig] = useState<DataFrameAnalyticsConfig | undefined>(undefined);
  const [isLoadingJobConfig, setIsLoadingJobConfig] = useState<boolean>(false);

  useEffect(() => {
    (async function() {
      setIsLoadingJobConfig(true);
      const analyticsConfigs: GetDataFrameAnalyticsResponse = await ml.dataFrameAnalytics.getDataFrameAnalytics(
        jobId
      );
      if (
        Array.isArray(analyticsConfigs.data_frame_analytics) &&
        analyticsConfigs.data_frame_analytics.length > 0
      ) {
        setJobConfig(analyticsConfigs.data_frame_analytics[0]);
        setIsLoadingJobConfig(false);
      }
    })();
  }, []);

  return (
    <Fragment>
      {isLoadingJobConfig === true && jobConfig === undefined && <LoadingPanel />}
      {isLoadingJobConfig === false && jobConfig !== undefined && (
        <EvaluatePanel jobConfig={jobConfig} />
      )}
      <EuiSpacer />
      {isLoadingJobConfig === true && jobConfig === undefined && <LoadingPanel />}
      {isLoadingJobConfig === false && jobConfig !== undefined && (
        <ResultsTable jobConfig={jobConfig} />
      )}
    </Fragment>
  );
};
