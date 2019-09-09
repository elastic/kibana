/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import createContainer from 'constate-latest';
import { useMemo, useEffect, useState } from 'react';
import { bucketSpan, getJobId } from '../../../../common/log_analysis';
import { useTrackedPromise } from '../../../utils/use_tracked_promise';
import { callSetupMlModuleAPI, SetupMlModuleResponsePayload } from './api/ml_setup_module_api';
import { callJobsSummaryAPI } from './api/ml_get_jobs_summary_api';

// combines and abstracts job and datafeed status
type JobStatus =
  | 'unknown'
  | 'missing'
  | 'inconsistent'
  | 'created'
  | 'started'
  | 'opening'
  | 'opened'
  | 'failed';

interface AllJobStatuses {
  [key: string]: JobStatus;
}

const getInitialJobStatuses = (): AllJobStatuses => {
  return {
    logEntryRate: 'unknown',
  };
};

export const useLogAnalysisJobs = ({
  indexPattern,
  sourceId,
  spaceId,
  timeField,
}: {
  indexPattern: string;
  sourceId: string;
  spaceId: string;
  timeField: string;
}) => {
  const [jobStatus, setJobStatus] = useState<AllJobStatuses>(getInitialJobStatuses());
  const [hasCompletedSetup, setHasCompletedSetup] = useState<boolean>(false);

  const [setupMlModuleRequest, setupMlModule] = useTrackedPromise(
    {
      cancelPreviousOn: 'resolution',
      createPromise: async (start, end) => {
        setJobStatus(getInitialJobStatuses());
        return await callSetupMlModuleAPI(
          start,
          end,
          spaceId,
          sourceId,
          indexPattern,
          timeField,
          bucketSpan
        );
      },
      onResolve: ({ datafeeds, jobs }: SetupMlModuleResponsePayload) => {
        const hasSuccessfullyCreatedJobs = jobs.every(job => job.success);
        const hasSuccessfullyStartedDatafeeds = datafeeds.every(
          datafeed => datafeed.success && datafeed.started
        );
        const hasAnyErrors =
          jobs.some(job => !!job.error) || datafeeds.some(datafeed => !!datafeed.error);

        setJobStatus(currentJobStatus => ({
          ...currentJobStatus,
          logEntryRate: hasAnyErrors
            ? 'failed'
            : hasSuccessfullyCreatedJobs
            ? hasSuccessfullyStartedDatafeeds
              ? 'started'
              : 'failed'
            : 'failed',
        }));

        setHasCompletedSetup(true);
      },
    },
    [indexPattern, spaceId, sourceId]
  );

  const [fetchJobStatusRequest, fetchJobStatus] = useTrackedPromise(
    {
      cancelPreviousOn: 'resolution',
      createPromise: async () => {
        return callJobsSummaryAPI(spaceId, sourceId);
      },
      onResolve: response => {
        if (response && response.length) {
          const logEntryRate = response.find(
            (job: any) => job.id === getJobId(spaceId, sourceId, 'log-entry-rate')
          );
          setJobStatus({
            logEntryRate: logEntryRate ? logEntryRate.jobState : 'unknown',
          });
        }
      },
      onReject: error => {
        // TODO: Handle errors
      },
    },
    [indexPattern, spaceId, sourceId]
  );

  useEffect(() => {
    fetchJobStatus();
  }, []);

  const isSetupRequired = useMemo(() => {
    const jobStates = Object.values(jobStatus);
    return (
      jobStates.filter(state => ['opened', 'opening', 'created', 'started'].includes(state))
        .length < jobStates.length
    );
  }, [jobStatus]);

  const isLoadingSetupStatus = useMemo(() => fetchJobStatusRequest.state === 'pending', [
    fetchJobStatusRequest.state,
  ]);

  const isSettingUpMlModule = useMemo(() => setupMlModuleRequest.state === 'pending', [
    setupMlModuleRequest.state,
  ]);

  const didSetupFail = useMemo(() => {
    const jobStates = Object.values(jobStatus);
    return jobStates.filter(state => state === 'failed').length > 0;
  }, [jobStatus]);

  return {
    jobStatus,
    isSetupRequired,
    isLoadingSetupStatus,
    setupMlModule,
    setupMlModuleRequest,
    isSettingUpMlModule,
    didSetupFail,
    hasCompletedSetup,
  };
};

export const LogAnalysisJobs = createContainer(useLogAnalysisJobs);
