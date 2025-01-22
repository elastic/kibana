/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useContext } from 'react';
import { JobDetailsFlyout } from './job_details_flyout';
import { DatafeedChartFlyout } from '../../jobs_list/components/datafeed_chart_flyout';
import { JobInfoFlyoutsContext } from './job_details_flyout_context';

export const JobInfoFlyoutsManager = () => {
  const { isDatafeedChartFlyoutOpen, activeJobId, closeActiveFlyout } =
    useContext(JobInfoFlyoutsContext);
  // @TODO: retrieve from hashmap?
  const job = {};

  return (
    <>
      <JobDetailsFlyout />
      {isDatafeedChartFlyoutOpen && activeJobId ? (
        <DatafeedChartFlyout
          onClose={() => {
            closeActiveFlyout();
          }}
          jobId={activeJobId}
          end={job?.data_counts?.latest_bucket_timestamp}
        />
      ) : null}
    </>
  );
};
