/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useMemo, useCallback, useEffect } from 'react';

import { callGetMlModuleAPI } from './api/ml_get_module';
import { bucketSpan, getJobId } from '../../../../common/log_analysis';
import { useTrackedPromise } from '../../../utils/use_tracked_promise';
import { callJobsSummaryAPI } from './api/ml_get_jobs_summary_api';
import { callSetupMlModuleAPI, SetupMlModuleResponsePayload } from './api/ml_setup_module_api';
import { useLogAnalysisCleanup } from './log_analysis_cleanup';
import { useStatusState } from './log_analysis_status_state';

export const useLogAnalysisJobs = <JobType extends string>({
  indexPattern,
  jobTypes,
  moduleId,
  sourceId,
  spaceId,
  jobParameters,
}: {
  indexPattern: string;
  jobTypes: JobType[];
  moduleId: string;
  sourceId: string;
  spaceId: string;
  jobParameters: { timestampField: string };
}) => {
  const { cleanupMLResources } = useLogAnalysisCleanup({ sourceId, spaceId });
  const [statusState, dispatch] = useStatusState(jobTypes, {
    bucketSpan,
    indexPattern,
    timestampField: jobParameters.timestampField,
  });

  const [fetchModuleDefinitionRequest, fetchModuleDefinition] = useTrackedPromise(
    {
      cancelPreviousOn: 'resolution',
      createPromise: async () => {
        dispatch({ type: 'fetchingModuleDefinition' });
        return await callGetMlModuleAPI(moduleId);
      },
      onResolve: response => {
        dispatch({
          type: 'fetchedModuleDefinition',
          spaceId,
          sourceId,
          moduleDefinition: response,
        });
      },
      onReject: () => {
        dispatch({ type: 'failedFetchingModuleDefinition' });
      },
    },
    []
  );

  const [setupMlModuleRequest, setupMlModule] = useTrackedPromise(
    {
      cancelPreviousOn: 'resolution',
      createPromise: async (
        indices: string[],
        start: number | undefined,
        end: number | undefined
      ) => {
        dispatch({ type: 'startedSetup' });
        return await callSetupMlModuleAPI(
          moduleId,
          start,
          end,
          spaceId,
          sourceId,
          indices.join(','),
          [
            {
              job_id: 'log-entry-rate' as const,
              analysis_config: {
                bucket_span: `${bucketSpan}ms`,
              },
              data_description: {
                time_field: jobParameters.timestampField,
              },
              custom_settings: {
                logs_source_config: {
                  indexPattern,
                  timestampField: jobParameters.timestampField,
                  bucketSpan,
                },
              },
            },
          ],
          []
        );
      },
      onResolve: ({ datafeeds, jobs }: SetupMlModuleResponsePayload) => {
        dispatch({ type: 'finishedSetup', datafeeds, jobs, spaceId, sourceId });
      },
      onReject: () => {
        dispatch({ type: 'failedSetup' });
      },
    },
    [spaceId, sourceId, jobParameters.timestampField, bucketSpan]
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
    [spaceId, sourceId]
  );

  const isLoadingSetupStatus = useMemo(
    () =>
      fetchJobStatusRequest.state === 'pending' || fetchModuleDefinitionRequest.state === 'pending',
    [fetchJobStatusRequest.state, fetchModuleDefinitionRequest.state]
  );

  const availableIndices = useMemo(() => indexPattern.split(','), [indexPattern]);

  const viewResults = useCallback(() => {
    dispatch({ type: 'viewedResults' });
  }, []);

  const cleanupAndSetup = useCallback(
    (indices: string[], start: number | undefined, end: number | undefined) => {
      dispatch({ type: 'startedSetup' });
      cleanupMLResources()
        .then(() => {
          setupMlModule(indices, start, end);
        })
        .catch(() => {
          dispatch({ type: 'failedSetup' });
        });
    },
    [cleanupMLResources, setupMlModule]
  );

  const viewSetupForReconfiguration = useCallback(() => {
    dispatch({ type: 'requestedJobConfigurationUpdate' });
  }, []);

  const viewSetupForUpdate = useCallback(() => {
    dispatch({ type: 'requestedJobDefinitionUpdate' });
  }, []);

  useEffect(() => {
    fetchModuleDefinition();
  }, [fetchModuleDefinition]);

  const jobIds = useMemo(() => {
    return jobTypes.reduce(
      (accumulatedJobIds, jobType) => ({
        ...accumulatedJobIds,
        [jobType]: getJobId(spaceId, sourceId, jobType),
      }),
      {} as Record<JobType, string>
    );
  }, [jobTypes, sourceId, spaceId]);

  return {
    availableIndices,
    fetchJobStatus,
    isLoadingSetupStatus,
    jobStatus: statusState.jobStatus,
    lastSetupErrorMessages: statusState.lastSetupErrorMessages,
    cleanupAndSetup,
    setup: setupMlModule,
    setupMlModuleRequest,
    setupStatus: statusState.setupStatus,
    viewSetupForReconfiguration,
    viewSetupForUpdate,
    viewResults,
    jobIds,
  };
};
