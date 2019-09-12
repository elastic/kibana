/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC, Fragment, useState, useEffect } from 'react';
import { EuiButton, EuiEmptyPrompt, EuiLoadingSpinner, EuiPanel } from '@elastic/eui';
// import { metaData } from 'ui/metadata';
// import { ml } from '../../services/ml_api_service';
// import { FormattedMessage } from '@kbn/i18n/react';

const createJobLink = '#/jobs/new_job/step/index_or_search';

export const AnomalyDetectionPanel: FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [jobs, setJobs] = useState([]); // Load jobs just once

  // const loadJobs = async () => {
  //   try {
  //     const jobsResult = await ml.jobs.jobsSummary([]);
  //     const jobsSummaryList = jobsResult.map((job: any) => {
  //       job.latestTimestampSortValue = job.latestTimestampMs || 0;
  //       return job;
  //     });
  //     setIsLoading(false);
  //     setJobs(jobsSummaryList);
  //   } catch (e) {
  //     // error toast
  //     setIsLoading(false);
  //   }
  // };

  useEffect(() => {
    // setIsLoading(true);
    // loadJobs();
  }, []);

  return (
    <EuiPanel>
      {isLoading && <EuiLoadingSpinner />}   
      {isLoading === false && jobs.length === 0 && (
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
      {isLoading === false && jobs.length > 0 && <div>Jobs display</div>}  
    </EuiPanel>
  );
};
