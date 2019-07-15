/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useContext, useEffect, useState } from 'react';
import { jobsSummary } from '../api';
import { Job } from '../types';
import { KibanaConfigContext } from '../../../lib/adapters/framework/kibana_framework_adapter';
import { hasMlUserPermissions } from '../../ml/permissions/has_ml_user_permissions';
import { MlCapabilitiesContext } from '../../ml/permissions/ml_capabilities_provider';

type Return = [boolean, Job[]];

export const getSiemJobsFromJobsSummary = (data: Job[]) =>
  data.reduce((jobs: Job[], job: Job) => {
    return job.groups.includes('siem') ? [...jobs, job] : jobs;
  }, []);

export const useJobSummaryData = (jobIds: string[] = [], refreshToggle = false): Return => {
  const [jobSummaryData, setJobSummaryData] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const config = useContext(KibanaConfigContext);
  const capabilities = useContext(MlCapabilitiesContext);
  const userPermissions = hasMlUserPermissions(capabilities);

  const fetchFunc = async () => {
    if (userPermissions) {
      const data: Job[] = await jobsSummary(jobIds, {
        'kbn-version': config.kbnVersion,
      });

      // TODO: API returns all jobs even though we specified jobIds -- jobsSummary call seems to match request in ML App?
      const siemJobs = getSiemJobsFromJobsSummary(data);

      setJobSummaryData(siemJobs);
    }
    setLoading(false);
  };

  useEffect(() => {
    setLoading(true);
    fetchFunc();
  }, [refreshToggle, userPermissions]);

  return [loading, jobSummaryData];
};
