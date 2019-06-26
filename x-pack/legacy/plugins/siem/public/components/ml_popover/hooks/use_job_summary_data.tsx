/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useEffect, useState } from 'react';
import { jobsSummary } from '../api';

interface Job {
  job_id: string;
  job_type: string;
  job_version: string;
  groups: string[];
  description: string;
  create_time: number;
  finished_time: number;
  model_snapshot_retention_days: number;
  model_snapshot_id: string;
  results_index_name: string;
}

interface JobSummary {
  count: number;
  jobs: Job[];
}

type Return = [boolean, JobSummary | null];

export const useJobSummaryData = (jobIds: string[], fetchAllJobs = false): Return => {
  const [jobSummaryData, setJobSummaryData] = useState<JobSummary | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchFunc = async () => {
    if (jobIds.length || fetchAllJobs) {
      const data: JobSummary = await jobsSummary(jobIds);
      setJobSummaryData(data);
    }
    setLoading(false);
  };

  useEffect(
    () => {
      setLoading(true);
      fetchFunc();
    },
    [jobIds.join(',')]
  );

  return [loading, jobSummaryData];
};
