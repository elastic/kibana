/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC, Fragment, useState, useEffect } from 'react';
import { EuiButton, EuiEmptyPrompt, EuiLoadingSpinner, EuiPanel } from '@elastic/eui';
// import { FormattedMessage } from '@kbn/i18n/react';

// Fetch jobs and determine what to show
export const AnalyticsPanel: FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [jobs, setJobs] = useState([]); // Load jobs just once

  return (
    <EuiPanel>
      {isLoading && <EuiLoadingSpinner />}     
      {isLoading === false && jobs.length === 0 && (
        <EuiEmptyPrompt
          iconType="createAdvancedJob"
          title={<h2>Create your first analytics job</h2>}
          body={
            <Fragment>
              <p>
                Data frame analytics enable you to perform different analyses of your data and
                annotate it with the results. As part of its output, data frame analytics appends
                the results of the analysis to the source data.
              </p>
            </Fragment>
          }
          actions={
            <EuiButton color="primary" fill>
              Create job
            </EuiButton>
          }
        />
      )}
      {isLoading === false && jobs.length > 0 && <div>BOB</div>}
    </EuiPanel>
  );
};
