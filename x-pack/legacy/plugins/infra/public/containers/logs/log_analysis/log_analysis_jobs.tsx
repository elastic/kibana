/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useCallback, useMemo } from 'react';

import { getJobId } from '../../../../common/log_analysis';
import { useTrackedPromise } from '../../../utils/use_tracked_promise';
import { callJobsSummaryAPI } from './api/ml_get_jobs_summary_api';
import { callGetMlModuleAPI } from './api/ml_get_module';
import {
  callSetupMlModuleAPI,
  SetupMlModuleDatafeedOverrides,
  SetupMlModuleJobOverrides,
  SetupMlModuleResponsePayload,
} from './api/ml_setup_module_api';
import { useLogAnalysisCleanup } from './log_analysis_cleanup';
import { useStatusState } from './log_analysis_status_state';

export const useLogAnalysisJobs = <JobType extends string>({
  bucketSpan,
  datafeedOverrides,
  indexPattern,
  jobOverrides,
  jobTypes,
  moduleId,
  sourceId,
  spaceId,
  timestampField,
}: {
  bucketSpan: number;
  datafeedOverrides: SetupMlModuleDatafeedOverrides[];
  indexPattern: string;
  jobOverrides: SetupMlModuleJobOverrides[];
  jobTypes: JobType[];
  moduleId: string;
  sourceId: string;
  spaceId: string;
  timestampField: string;
}) => {
  const { cleanupMLResources } = useLogAnalysisCleanup({ sourceId, spaceId, jobTypes });
  const [statusState, dispatch] = useStatusState(jobTypes, {
    bucketSpan,
    indexPattern,
    timestampField,
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
    [moduleId]
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
          jobOverrides,
          datafeedOverrides
        );
      },
      onResolve: ({ datafeeds, jobs }: SetupMlModuleResponsePayload) => {
        dispatch({ type: 'finishedSetup', datafeeds, jobs, spaceId, sourceId });
      },
      onReject: () => {
        dispatch({ type: 'failedSetup' });
      },
    },
    [moduleId, spaceId, sourceId, timestampField, bucketSpan, jobOverrides, datafeedOverrides]
  );

  const [fetchJobStatusRequest, fetchJobStatus] = useTrackedPromise(
    {
      cancelPreviousOn: 'resolution',
      createPromise: async () => {
        dispatch({ type: 'fetchingJobStatuses' });
        return await callJobsSummaryAPI(spaceId, sourceId, jobTypes);
      },
      onResolve: response => {
        dispatch({ type: 'fetchedJobStatuses', payload: response, spaceId, sourceId });
      },
      onReject: () => {
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
    fetchModuleDefinition,
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
