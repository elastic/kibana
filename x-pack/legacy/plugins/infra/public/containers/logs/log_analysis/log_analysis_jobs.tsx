/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import createContainer from 'constate-latest';
import { useMemo, useCallback } from 'react';
import { bucketSpan } from '../../../../common/log_analysis';
import { useTrackedPromise } from '../../../utils/use_tracked_promise';
import { callJobsSummaryAPI } from './api/ml_get_jobs_summary_api';
import { callSetupMlModuleAPI, SetupMlModuleResponsePayload } from './api/ml_setup_module_api';
import { useLogAnalysisCleanup } from './log_analysis_cleanup';
import { useStatusState } from './log_analysis_status_state';

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
  const [statusState, dispatch] = useStatusState();

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
    fetchJobStatus,
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
