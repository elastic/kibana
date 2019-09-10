/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import createContainer from 'constate-latest';
import { useMemo, useEffect, useState, useCallback } from 'react';
import { bucketSpan, getJobId } from '../../../../common/log_analysis';
import { useTrackedPromise } from '../../../utils/use_tracked_promise';
import { callSetupMlModuleAPI, SetupMlModuleResponsePayload } from './api/ml_setup_module_api';
import { callJobsSummaryAPI } from './api/ml_get_jobs_summary_api';
import { useLogAnalysisCleanup } from './log_analysis_cleanup';

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

export type SetupStatus =
  | 'unknown' // initial state, we're still waiting to load the job status
  | 'required' // jobs are missing
  | 'pending' // called module setup, waiting for response
  | 'retrying' // cleaning up and calling module setup again
  | 'succeeded' // setup succeeded, notifying user
  | 'failed' // setup failed, notifying user
  | 'hiddenAfterSuccess' // hide the setup screen and we show the results for the first time
  | 'skipped'; // setup hidden because the module is in a correct state already

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
  const { cleanupMLResources } = useLogAnalysisCleanup({ sourceId, spaceId });
  const [jobStatus, setJobStatus] = useState<AllJobStatuses>(getInitialJobStatuses());
  const [setupStatus, setSetupStatus] = useState<SetupStatus>('unknown');

  const [setupMlModuleRequest, setupMlModule] = useTrackedPromise(
    {
      cancelPreviousOn: 'resolution',
      createPromise: async (start, end) => {
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
        const logEntryRateJobStatus = hasAnyErrors
          ? 'failed'
          : hasSuccessfullyCreatedJobs
          ? hasSuccessfullyStartedDatafeeds
            ? 'started'
            : 'created'
          : 'created';
        setSetupStatus(logEntryRateJobStatus === 'failed' ? 'failed' : 'succeeded');
        setJobStatus(currentJobStatus => ({
          ...currentJobStatus,
          logEntryRate: logEntryRateJobStatus,
        }));
      },
      onReject: () => {
        setSetupStatus('failed');
        setJobStatus(currentJobStatus => ({
          ...currentJobStatus,
          logEntryRate: 'failed',
        }));
      },
    },
    [indexPattern, spaceId, sourceId, timeField, bucketSpan, setJobStatus, setSetupStatus]
  );

  const [fetchJobStatusRequest, fetchJobStatus] = useTrackedPromise(
    {
      cancelPreviousOn: 'resolution',
      createPromise: async () => {
        return callJobsSummaryAPI(spaceId, sourceId);
      },
      onResolve: response => {
        if (response) {
          const logEntryRate = response.find(
            (job: any) => job.id === getJobId(spaceId, sourceId, 'log-entry-rate')
          );
          const logEntryRateJobStatus = logEntryRate ? logEntryRate.jobState : 'missing';
          setSetupStatus(
            logEntryRateJobStatus === 'missing'
              ? 'required'
              : ['opened', 'opening', 'created', 'started'].includes(logEntryRateJobStatus)
              ? 'skipped'
              : 'required'
          );
          setJobStatus({
            logEntryRate: logEntryRateJobStatus,
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

  const isLoadingSetupStatus = useMemo(() => fetchJobStatusRequest.state === 'pending', [
    fetchJobStatusRequest.state,
  ]);

  const viewResults = useCallback(() => {
    setSetupStatus('hiddenAfterSuccess');
  }, [setSetupStatus]);

  const setup = useCallback(
    (start, end) => {
      setSetupStatus('pending');
      setupMlModule(start, end);
    },
    [setSetupStatus, setupMlModule]
  );

  const retry = useCallback(
    (start, end) => {
      setSetupStatus('retrying');
      cleanupMLResources()
        .then(() => {
          setupMlModule(start, end);
        })
        .catch(() => {
          setSetupStatus('failed');
        });
    },
    [setSetupStatus, cleanupMLResources, setupMlModule]
  );

  return {
    setupMlModuleRequest,
    jobStatus,
    isLoadingSetupStatus,
    setup,
    retry,
    setupStatus,
    viewResults,
  };
};

export const LogAnalysisJobs = createContainer(useLogAnalysisJobs);
