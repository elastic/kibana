/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import createContainer from 'constate-latest';
import { useMemo, useEffect, useCallback, useReducer } from 'react';
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

const initialState = {
  jobStatus: getInitialJobStatuses(),
  setupStatus: 'unknown',
};

function statusReducer(state: any, action: any) {
  switch (action.type) {
    case 'startedSetup':
      return {
        ...state,
        setupStatus: 'pending',
      };
    case 'finishedSetup':
      const { jobs, datafeeds }: SetupMlModuleResponsePayload = action;
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
      return {
        jobStatus: {
          ...state.jobStatus,
          logEntryRate: logEntryRateJobStatus,
        },
        setupStatus: logEntryRateJobStatus === 'failed' ? 'failed' : 'succeeded',
      };
    case 'failedSetup':
      return {
        jobStatus: {
          ...state.jobStatus,
          logEntryRate: 'failed',
        },
        setupStatus: 'failed',
      };
    case 'retryingSetup':
      return {
        ...state,
        setupStatus: 'retrying',
      };
    case 'fetchedJobStatuses':
      const { payload, spaceId, sourceId } = action;
      const logEntryRate = payload.find(
        (job: any) => job.id === getJobId(spaceId, sourceId, 'log-entry-rate')
      );
      const logEntryRateJobStatusResponse = logEntryRate ? logEntryRate.jobState : 'missing';

      return {
        jobStatus: {
          ...state.jobStatus,
          logEntryRate: logEntryRateJobStatusResponse,
        },
        setupStatus:
          logEntryRateJobStatusResponse === 'missing'
            ? 'required'
            : ['opened', 'opening', 'created', 'started'].includes(logEntryRateJobStatusResponse)
            ? 'skipped'
            : 'required',
      };
    case 'viewedResults':
      return {
        ...state,
        setupStatus: 'hiddenAfterSuccess',
      };
    default:
      return state;
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
        dispatch({ type: 'finishedSetup', datafeeds, jobs });
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
        return callJobsSummaryAPI(spaceId, sourceId);
      },
      onResolve: response => {
        if (response) {
          dispatch({ type: 'fetchedJobStatuses', payload: response, spaceId, sourceId });
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
    dispatch({ type: 'viewedResults' });
  }, []);

  const setup = useCallback(
    (start, end) => {
      setupMlModule(start, end);
    },
    [setupMlModule]
  );

  const retry = useCallback(
    (start, end) => {
      dispatch({ type: 'retryingSetup' });
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
    setup,
    retry,
    setupStatus: statusState.setupStatus,
    viewResults,
  };
};

export const LogAnalysisJobs = createContainer(useLogAnalysisJobs);
