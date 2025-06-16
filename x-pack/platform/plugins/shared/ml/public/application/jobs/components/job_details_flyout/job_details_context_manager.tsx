/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useContext, useMemo } from 'react';
import { useUrlState } from '@kbn/ml-url-state';
import moment from 'moment';
import { JobDetailsFlyout } from './job_details_flyout';
import { DatafeedChartFlyout } from '../../jobs_list/components/datafeed_chart_flyout';
import { JobInfoFlyoutsContext } from './job_details_flyout_context';

export const JobInfoFlyoutsManager = () => {
  const { isDatafeedChartFlyoutOpen, activeJobId, closeActiveFlyout } =
    useContext(JobInfoFlyoutsContext);
  const [globalState] = useUrlState('_g');
  const end = useMemo(
    () => moment(globalState?.time?.to).unix() * 1000 ?? 0,
    [globalState?.time?.to]
  );

  return (
    <>
      <JobDetailsFlyout />
      {isDatafeedChartFlyoutOpen && activeJobId ? (
        <DatafeedChartFlyout onClose={closeActiveFlyout} jobId={activeJobId} end={end} />
      ) : null}
    </>
  );
};
