/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useEffect, useState } from 'react';
import { jobsSummary } from '../api';
import { Job } from '../types';

type Return = [boolean, Job[] | null];

export const getSiemJobsFromJobsSummary = (data: Job[]) =>
  data.reduce((jobs: Job[], job: Job) => {
    return job.groups.includes('siem') ? [...jobs, job] : jobs;
  }, []);

export const useJobSummaryData = (jobIds: string[], refetchSummaryData = false): Return => {
  const [jobSummaryData, setJobSummaryData] = useState<Job[] | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchFunc = async () => {
    if (jobIds.length > 0) {
      const data: Job[] = await jobsSummary(jobIds);

      // TODO: API returns all jobs even though we specified jobIds -- jobsSummary call seems to match request in ML App?
      const siemJobs = getSiemJobsFromJobsSummary(data);

      setJobSummaryData(siemJobs);
    }
    setLoading(false);
  };

  useEffect(
    () => {
      setLoading(true);
      fetchFunc();
    },
    [jobIds.join(','), refetchSummaryData]
  );

  return [loading, jobSummaryData];
};
