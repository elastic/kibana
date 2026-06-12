/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React from 'react';

import type { MlSummaryJob } from '@kbn/ml-common-types/anomaly_detection_jobs/summary_job';

import { JobGroup } from '../job_group';

interface Props {
  job: MlSummaryJob;
}

export const JobDescription: FC<Props> = ({ job }) => {
  return (
    <div className="job-description">
      {job.description} &nbsp;
      {job.groups.map((group) => (
        <JobGroup key={group} name={group} />
      ))}
    </div>
  );
};
