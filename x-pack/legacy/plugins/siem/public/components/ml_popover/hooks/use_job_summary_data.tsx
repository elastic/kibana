/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useEffect, useState } from 'react';
import { jobsSummary } from '../api';

interface Job {
  datafeedId: string;
  datafeedIndices: string[];
  datafeedState: string;
  description: string;
  earliestTimestampMs: number;
  groups: string[];
  hasDatafeed: boolean;
  id: string;
  isSingleMetricViewerJob: boolean;
  jobState: string;
  latestTimestampMs: number;
  memory_status: string;
  processed_record_count: number;
}

type Return = [boolean, Job[] | null];

export const useJobSummaryData = (jobIds: string[], refetchSummaryData = false): Return => {
  const [jobSummaryData, setJobSummaryData] = useState<Job[] | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchFunc = async () => {
    if (jobIds.length > 0) {
      const data: Job[] = await jobsSummary(jobIds);

      // TODO: API returns all jobs even though we specified jobIds -- jobsSummary call seems to match request in ML App???
      const siemJobs = data.reduce((jobs: Job[], job: Job) => {
        return job.groups.includes('siem') ? [...jobs, job] : jobs;
      }, []);

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
