/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC, Fragment, useState, useEffect } from 'react';
import { EuiCallOut, EuiPanel, EuiSpacer, EuiTitle } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { ml } from '../../../../../services/ml_api_service';
import { DataFrameAnalyticsConfig } from '../../../../common';
import { EvaluatePanel } from './evaluate_panel';
import { ResultsTable } from './results_table';
import { DATA_FRAME_TASK_STATE } from '../../../analytics_management/components/analytics_list/common';
import { ResultsSearchQuery, defaultSearchQuery } from '../../../../common/analytics';
import { LoadingPanel } from '../loading_panel';

interface GetDataFrameAnalyticsResponse {
  count: number;
  data_frame_analytics: DataFrameAnalyticsConfig[];
}

export const ExplorationTitle: React.FC<{ jobId: string }> = ({ jobId }) => (
  <EuiTitle size="xs">
    <span>
      {i18n.translate('xpack.ml.dataframe.analytics.classificationExploration.tableJobIdTitle', {
        defaultMessage: 'Destination index for classification job ID {jobId}',
        values: { jobId },
      })}
    </span>
  </EuiTitle>
);

interface Props {
  jobId: string;
  jobStatus: DATA_FRAME_TASK_STATE;
}

export const ClassificationExploration: FC<Props> = ({ jobId, jobStatus }) => {
  const [jobConfig, setJobConfig] = useState<DataFrameAnalyticsConfig | undefined>(undefined);
  const [isLoadingJobConfig, setIsLoadingJobConfig] = useState<boolean>(false);
  const [jobConfigErrorMessage, setJobConfigErrorMessage] = useState<undefined | string>(undefined);
  const [searchQuery, setSearchQuery] = useState<ResultsSearchQuery>(defaultSearchQuery);

  const loadJobConfig = async () => {
    setIsLoadingJobConfig(true);
    try {
      const analyticsConfigs: GetDataFrameAnalyticsResponse = await ml.dataFrameAnalytics.getDataFrameAnalytics(
        jobId
      );
      if (
        Array.isArray(analyticsConfigs.data_frame_analytics) &&
        analyticsConfigs.data_frame_analytics.length > 0
      ) {
        setJobConfig(analyticsConfigs.data_frame_analytics[0]);
        setIsLoadingJobConfig(false);
      } else {
        setJobConfigErrorMessage(
          i18n.translate(
            'xpack.ml.dataframe.analytics.classificationExploration.jobConfigurationNoResultsMessage',
            {
              defaultMessage: 'No results found.',
            }
          )
        );
      }
    } catch (e) {
      if (e.message !== undefined) {
        setJobConfigErrorMessage(e.message);
      } else {
        setJobConfigErrorMessage(JSON.stringify(e));
      }
      setIsLoadingJobConfig(false);
    }
  };

  useEffect(() => {
    loadJobConfig();
  }, []);

  if (jobConfigErrorMessage !== undefined) {
    return (
      <EuiPanel grow={false}>
        <ExplorationTitle jobId={jobId} />
        <EuiSpacer />
        <EuiCallOut
          title={i18n.translate(
            'xpack.ml.dataframe.analytics.classificationExploration.jobConfigurationFetchError',
            {
              defaultMessage:
                'Unable to fetch results. An error occurred loading the job configuration data.',
            }
          )}
          color="danger"
          iconType="cross"
        >
          <p>{jobConfigErrorMessage}</p>
        </EuiCallOut>
      </EuiPanel>
    );
  }

  return (
    <Fragment>
      {isLoadingJobConfig === true && jobConfig === undefined && <LoadingPanel />}
      {isLoadingJobConfig === false && jobConfig !== undefined && (
        <EvaluatePanel jobConfig={jobConfig} jobStatus={jobStatus} searchQuery={searchQuery} />
      )}
      <EuiSpacer />
      {isLoadingJobConfig === true && jobConfig === undefined && <LoadingPanel />}
      {isLoadingJobConfig === false && jobConfig !== undefined && (
        <ResultsTable
          jobConfig={jobConfig}
          jobStatus={jobStatus}
          setEvaluateSearchQuery={setSearchQuery}
        />
      )}
    </Fragment>
  );
};
