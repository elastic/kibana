/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useContext, useEffect, useState } from 'react';

import { jobsSummary } from '../api';
import { Job } from '../types';
import { hasMlUserPermissions } from '../../ml/permissions/has_ml_user_permissions';
import { MlCapabilitiesContext } from '../../ml/permissions/ml_capabilities_provider';
import { useStateToaster } from '../../toasters';
import { errorToToaster } from '../../ml/api/error_to_toaster';
import { useKibanaUiSetting } from '../../../lib/settings/use_kibana_ui_setting';
import { DEFAULT_KBN_VERSION } from '../../../../common/constants';

import * as i18n from './translations';

type Return = [boolean, Job[] | null];

export const getSiemJobsFromJobsSummary = (data: Job[]) =>
  data.reduce((jobs: Job[], job: Job) => {
    return job.groups.includes('siem') ? [...jobs, job] : jobs;
  }, []);

export const useJobSummaryData = (jobIds: string[] = [], refreshToggle = false): Return => {
  const [jobSummaryData, setJobSummaryData] = useState<Job[] | null>(null);
  const [loading, setLoading] = useState(true);
  const capabilities = useContext(MlCapabilitiesContext);
  const userPermissions = hasMlUserPermissions(capabilities);
  const [, dispatchToaster] = useStateToaster();
  const [kbnVersion] = useKibanaUiSetting(DEFAULT_KBN_VERSION);

  useEffect(() => {
    let isSubscribed = true;
    setLoading(true);

    async function fetchSiemJobsFromJobsSummary() {
      if (userPermissions) {
        try {
          const data: Job[] = await jobsSummary(jobIds, {
            'kbn-version': kbnVersion,
          });

          // TODO: API returns all jobs even though we specified jobIds -- jobsSummary call seems to match request in ML App?
          const siemJobs = getSiemJobsFromJobsSummary(data);
          if (isSubscribed) {
            setJobSummaryData(siemJobs);
          }
        } catch (error) {
          if (isSubscribed) {
            errorToToaster({ title: i18n.JOB_SUMMARY_FETCH_FAILURE, error, dispatchToaster });
          }
        }
      }
      if (isSubscribed) {
        setLoading(false);
      }
    }

    fetchSiemJobsFromJobsSummary();
    return () => {
      isSubscribed = true;
    };
  }, [refreshToggle, userPermissions]);

  return [loading, jobSummaryData];
};
