/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import createContainer from 'constate-latest';
import { useEffect, useMemo, useState } from 'react';

import { bucketSpan, getDatafeedId, getJobId, JobType } from '../../../../common/log_analysis';
import { useTrackedPromise } from '../../../utils/use_tracked_promise';
import { callJobsSummaryAPI, FetchJobStatusResponsePayload } from './api/ml_get_jobs_summary_api';
import { callSetupMlModuleAPI, SetupMlModuleResponsePayload } from './api/ml_setup_module_api';

// combines and abstracts job and datafeed status
type JobStatus =
  | 'unknown'
  | 'missing'
  | 'initializing'
  | 'stopped'
  | 'started'
  | 'finished'
  | 'failed';

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
  const [jobStatus, setJobStatus] = useState<Record<JobType, JobStatus>>({
    'log-entry-rate': 'unknown',
  });
  const [hasCompletedSetup, setHasCompletedSetup] = useState<boolean>(false);

  const [setupMlModuleRequest, setupMlModule] = useTrackedPromise(
    {
      cancelPreviousOn: 'resolution',
      createPromise: async (start, end) => {
        setJobStatus(currentJobStatus => ({
          ...currentJobStatus,
          'log-entry-rate': 'initializing',
        }));
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
        setJobStatus(currentJobStatus => ({
          ...currentJobStatus,
          'log-entry-rate':
            hasSuccessfullyCreatedJob(getJobId(spaceId, sourceId, 'log-entry-rate'))(jobs) &&
            hasSuccessfullyStartedDatafeed(getDatafeedId(spaceId, sourceId, 'log-entry-rate'))(
              datafeeds
            )
              ? 'started'
              : 'failed',
        }));

        setHasCompletedSetup(true);
      },
      onReject: () => {
        setJobStatus(currentJobStatus => ({
          ...currentJobStatus,
          'log-entry-rate': 'failed',
        }));
      },
    },
    [indexPattern, spaceId, sourceId]
  );

  const [fetchJobStatusRequest, fetchJobStatus] = useTrackedPromise(
    {
      cancelPreviousOn: 'resolution',
      createPromise: async () => {
        return await callJobsSummaryAPI(spaceId, sourceId);
      },
      onResolve: response => {
        setJobStatus(currentJobStatus => ({
          ...currentJobStatus,
          'log-entry-rate': getJobStatus(getJobId(spaceId, sourceId, 'log-entry-rate'))(response),
        }));
      },
      onReject: err => {
        setJobStatus(currentJobStatus => ({
          ...currentJobStatus,
          'log-entry-rate': 'unknown',
        }));
      },
    },
    [indexPattern, spaceId, sourceId]
  );

  useEffect(() => {
    fetchJobStatus();
  }, []);

  const isSetupRequired = useMemo(() => {
    return !Object.values(jobStatus).every(state => ['started', 'finished'].includes(state));
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

const hasSuccessfullyCreatedJob = (jobId: string) => (
  jobSetupResponses: SetupMlModuleResponsePayload['jobs']
) =>
  jobSetupResponses.filter(
    jobSetupResponse =>
      jobSetupResponse.id === jobId && jobSetupResponse.success && !jobSetupResponse.error
  ).length > 0;

const hasSuccessfullyStartedDatafeed = (datafeedId: string) => (
  datafeedSetupResponses: SetupMlModuleResponsePayload['datafeeds']
) =>
  datafeedSetupResponses.filter(
    datafeedSetupResponse =>
      datafeedSetupResponse.id === datafeedId &&
      datafeedSetupResponse.success &&
      datafeedSetupResponse.started &&
      !datafeedSetupResponse.error
  ).length > 0;

const getJobStatus = (jobId: string) => (jobSummaries: FetchJobStatusResponsePayload): JobStatus =>
  jobSummaries
    .filter(jobSummary => jobSummary.id === jobId)
    .map(
      (jobSummary): JobStatus => {
        if (jobSummary.jobState === 'failed') {
          return 'failed';
        } else if (
          jobSummary.jobState === 'closed' &&
          jobSummary.datafeedState === 'stopped' &&
          jobSummary.fullJob &&
          jobSummary.fullJob.finished_time != null
        ) {
          return 'finished';
        } else if (
          jobSummary.jobState === 'closed' ||
          jobSummary.jobState === 'closing' ||
          jobSummary.datafeedState === 'stopped'
        ) {
          return 'stopped';
        } else if (jobSummary.jobState === 'opening') {
          return 'initializing';
        } else if (jobSummary.jobState === 'opened' && jobSummary.datafeedState === 'started') {
          return 'started';
        }

        return 'unknown';
      }
    )[0] || 'missing';
