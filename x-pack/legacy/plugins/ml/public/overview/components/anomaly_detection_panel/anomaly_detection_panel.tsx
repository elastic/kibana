/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC, Fragment, useState, useEffect } from 'react';
import { EuiButton, EuiCallOut, EuiEmptyPrompt, EuiLoadingSpinner, EuiPanel } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { AnomalyDetectionTable } from './table';
// import { metaData } from 'ui/metadata';
import { ml } from '../../../services/ml_api_service';
import { getGroupsFromJobs, getStatsBarData } from './utils';

const createJobLink = '#/jobs/new_job/step/index_or_search';

// jobsSummary to get: stats bar info, jobs in group, latest timestamp, docs_processed
export const AnomalyDetectionPanel: FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [groupsList, setGroupsList] = useState([]);
  const [statsBarData, setStatsBarData] = useState<any>(undefined);
  const [errorMessage, setErrorMessage] = useState<any>(undefined);

  const loadJobs = async () => {
    try {
      const jobsResult = await ml.jobs.jobsSummary([]);
      const jobsSummaryList = jobsResult.map((job: any) => {
        job.latestTimestampSortValue = job.latestTimestampMs || 0;
        return job;
      });
      const groups = getGroupsFromJobs(jobsSummaryList);
      // const stats = getStatsBarData(jobsSummaryList);
      setIsLoading(false);
      setErrorMessage(undefined);
      setGroupsList(groups);
      // setStatsBarData(stats);
    } catch (e) {
      setErrorMessage(e);
      setIsLoading(false);
    }
  };

  useEffect(() => {
    setIsLoading(true);
    loadJobs();
  }, []);

  const errorDisplay = (
    <Fragment>
      <EuiCallOut
        title={i18n.translate('xpack.ml.overview.anomalyDetection.errorPromptTitle', {
          defaultMessage: 'An error occurred getting the anomaly detection jobs list.',
        })}
        color="danger"
        iconType="alert"
      >
        <pre>{JSON.stringify(errorMessage)}</pre>
      </EuiCallOut>
    </Fragment>
  );

  return (
    <EuiPanel>
      {typeof errorMessage !== 'undefined' && errorDisplay}
      {isLoading && <EuiLoadingSpinner />}   
      {isLoading === false && typeof errorMessage === 'undefined' && groupsList.length === 0 && (
        <EuiEmptyPrompt
          iconType="createSingleMetricJob"
          title={<h2>Create your first anomaly detection job</h2>}
          body={
            <Fragment>
              <p>
                Machine learning makes it easy to detect anomalies in time series data stored in
                Elasticsearch. Track one metric from a single machine or hundreds of metrics across
                thousands of machines. Start automatically spotting the anomalies hiding in your
                data and resolve issues faster.              
              </p>
            </Fragment>
          }
          actions={
            <EuiButton color="primary" href={createJobLink} fill>
              Create job
            </EuiButton>
          }
        />
      )}
      {isLoading === false && typeof errorMessage === 'undefined' && groupsList.length > 0 && (
        <AnomalyDetectionTable items={groupsList} statsBarData={statsBarData} />
      )}
        
    </EuiPanel>
  );
};
