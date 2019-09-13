/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import createContainer from 'constate-latest';
import { useEffect, useMemo, useReducer, useCallback } from 'react';
import { bucketSpan, getDatafeedId, getJobId, JobType } from '../../../../common/log_analysis';
import { useTrackedPromise } from '../../../utils/use_tracked_promise';
import { callJobsSummaryAPI, FetchJobStatusResponsePayload } from './api/ml_get_jobs_summary_api';
import { callSetupMlModuleAPI, SetupMlModuleResponsePayload } from './api/ml_setup_module_api';
import { useLogAnalysisCleanup } from './log_analysis_cleanup';

// combines and abstracts job and datafeed status
type JobStatus =
  | 'unknown'
  | 'missing'
  | 'initializing'
  | 'stopped'
  | 'started'
  | 'finished'
  | 'failed';

export type SetupStatus =
  | 'initializing' // acquiring job statuses to determine setup status
  | 'unknown' // job status could not be acquired (failed request etc)
  | 'required' // jobs are missing
  | 'pending' // In the process of setting up the module for the first time or retrying, waiting for response
  | 'succeeded' // setup succeeded, notifying user
  | 'failed' // setup failed, notifying user
  | 'hiddenAfterSuccess' // hide the setup screen and we show the results for the first time
  | 'skipped'; // setup hidden because the module is in a correct state already

interface StatusReducerState {
  jobStatus: Record<JobType, JobStatus>;
  setupStatus: SetupStatus;
}

type StatusReducerAction =
  | { type: 'startedSetup' }
  | {
      type: 'finishedSetup';
      sourceId: string;
      spaceId: string;
      jobs: SetupMlModuleResponsePayload['jobs'];
      datafeeds: SetupMlModuleResponsePayload['datafeeds'];
    }
  | { type: 'failedSetup' }
  | { type: 'fetchingJobStatuses' }
  | {
      type: 'fetchedJobStatuses';
      spaceId: string;
      sourceId: string;
      payload: FetchJobStatusResponsePayload;
    }
  | { type: 'failedFetchingJobStatuses' }
  | { type: 'viewedResults' };

const initialState: StatusReducerState = {
  jobStatus: {
    'log-entry-rate': 'unknown',
  },
  setupStatus: 'initializing',
};

function statusReducer(state: StatusReducerState, action: StatusReducerAction): StatusReducerState {
  switch (action.type) {
    case 'startedSetup': {
      return {
        jobStatus: {
          'log-entry-rate': 'initializing',
        },
        setupStatus: 'pending',
      };
    }
    case 'finishedSetup': {
      const { jobs, datafeeds, spaceId, sourceId } = action;
      const nextJobStatus = {
        ...state.jobStatus,
        'log-entry-rate':
          hasSuccessfullyCreatedJob(getJobId(spaceId, sourceId, 'log-entry-rate'))(jobs) &&
          hasSuccessfullyStartedDatafeed(getDatafeedId(spaceId, sourceId, 'log-entry-rate'))(
            datafeeds
          )
            ? ('started' as JobStatus)
            : ('failed' as JobStatus),
      };
      const nextSetupStatus = Object.values(nextJobStatus).every(jobState =>
        ['started'].includes(jobState)
      )
        ? 'succeeded'
        : 'failed';
      return {
        jobStatus: nextJobStatus,
        setupStatus: nextSetupStatus,
      };
    }
    case 'failedSetup': {
      return {
        jobStatus: {
          ...state.jobStatus,
          'log-entry-rate': 'failed',
        },
        setupStatus: 'failed',
      };
    }
    case 'fetchingJobStatuses': {
      return {
        ...state,
        setupStatus: 'initializing',
      };
    }
    case 'fetchedJobStatuses': {
      const { payload, spaceId, sourceId } = action;
      const nextJobStatus = {
        ...state.jobStatus,
        'log-entry-rate': getJobStatus(getJobId(spaceId, sourceId, 'log-entry-rate'))(payload),
      };
      const nextSetupStatus = Object.values(nextJobStatus).every(jobState =>
        ['started', 'finished'].includes(jobState)
      )
        ? 'skipped'
        : 'required';
      return {
        jobStatus: nextJobStatus,
        setupStatus: nextSetupStatus,
      };
    }
    case 'failedFetchingJobStatuses': {
      return {
        ...state,
        jobStatus: {
          ...state.jobStatus,
          'log-entry-rate': 'unknown',
        },
      };
    }
    case 'viewedResults': {
      return {
        ...state,
        setupStatus: 'hiddenAfterSuccess',
      };
    }
    default: {
      return state;
    }
  }
}

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
  const [statusState, dispatch] = useReducer(statusReducer, initialState);

  const [setupMlModuleRequest, setupMlModule] = useTrackedPromise(
    {
      cancelPreviousOn: 'resolution',
      createPromise: async (start, end) => {
        dispatch({ type: 'startedSetup' });
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
        dispatch({ type: 'finishedSetup', datafeeds, jobs, spaceId, sourceId });
      },
      onReject: () => {
        dispatch({ type: 'failedSetup' });
      },
    },
    [indexPattern, spaceId, sourceId, timeField, bucketSpan]
  );

  const [fetchJobStatusRequest, fetchJobStatus] = useTrackedPromise(
    {
      cancelPreviousOn: 'resolution',
      createPromise: async () => {
        dispatch({ type: 'fetchingJobStatuses' });
        return await callJobsSummaryAPI(spaceId, sourceId);
      },
      onResolve: response => {
        dispatch({ type: 'fetchedJobStatuses', payload: response, spaceId, sourceId });
      },
      onReject: err => {
        dispatch({ type: 'failedFetchingJobStatuses' });
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
    dispatch({ type: 'viewedResults' });
  }, []);

  const retry = useCallback(
    (start, end) => {
      dispatch({ type: 'startedSetup' });
      cleanupMLResources()
        .then(() => {
          setupMlModule(start, end);
        })
        .catch(() => {
          dispatch({ type: 'failedSetup' });
        });
    },
    [cleanupMLResources, setupMlModule]
  );

  return {
    setupMlModuleRequest,
    jobStatus: statusState.jobStatus,
    isLoadingSetupStatus,
    setup: setupMlModule,
    retry,
    setupStatus: statusState.setupStatus,
    viewResults,
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
