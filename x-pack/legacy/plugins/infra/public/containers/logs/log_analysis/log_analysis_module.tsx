/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useCallback, useMemo } from 'react';

import { useTrackedPromise } from '../../../utils/use_tracked_promise';
import { useModuleStatus } from './log_analysis_module_status';
import { ModuleDescriptor, ModuleSourceConfiguration } from './log_analysis_module_types';

export const useLogAnalysisModule = <JobType extends string>({
  sourceConfiguration,
  moduleDescriptor,
}: {
  sourceConfiguration: ModuleSourceConfiguration;
  moduleDescriptor: ModuleDescriptor<JobType>;
}) => {
  const { spaceId, sourceId, timestampField, indices } = sourceConfiguration;
  const [moduleStatus, dispatchModuleStatus] = useModuleStatus(moduleDescriptor.jobTypes, {
    bucketSpan: moduleDescriptor.bucketSpan,
    indexPattern: indices.join(','),
    timestampField,
  });

  const [fetchModuleDefinitionRequest, fetchModuleDefinition] = useTrackedPromise(
    {
      cancelPreviousOn: 'resolution',
      createPromise: async () => {
        dispatchModuleStatus({ type: 'fetchingModuleDefinition' });
        return await moduleDescriptor.getModuleDefinition();
      },
      onResolve: response => {
        dispatchModuleStatus({
          type: 'fetchedModuleDefinition',
          spaceId,
          sourceId,
          moduleDefinition: response,
        });
      },
      onReject: () => {
        dispatchModuleStatus({ type: 'failedFetchingModuleDefinition' });
      },
    },
    [moduleDescriptor.getModuleDefinition, spaceId, sourceId]
  );

  const [fetchJobStatusRequest, fetchJobStatus] = useTrackedPromise(
    {
      cancelPreviousOn: 'resolution',
      createPromise: async () => {
        dispatchModuleStatus({ type: 'fetchingJobStatuses' });
        return await moduleDescriptor.getJobSummary(spaceId, sourceId);
      },
      onResolve: jobResponse => {
        dispatchModuleStatus({
          type: 'fetchedJobStatuses',
          payload: jobResponse,
          spaceId,
          sourceId,
        });
      },
      onReject: () => {
        dispatchModuleStatus({ type: 'failedFetchingJobStatuses' });
      },
    },
    [spaceId, sourceId]
  );

  const isLoadingModuleStatus = useMemo(
    () =>
      fetchJobStatusRequest.state === 'pending' || fetchModuleDefinitionRequest.state === 'pending',
    [fetchJobStatusRequest.state, fetchModuleDefinitionRequest.state]
  );

  const [, setUpModule] = useTrackedPromise(
    {
      cancelPreviousOn: 'resolution',
      createPromise: async (
        selectedIndices: string[],
        start: number | undefined,
        end: number | undefined
      ) => {
        dispatchModuleStatus({ type: 'startedSetup' });
        return await moduleDescriptor.setUpModule(start, end, {
          indices: selectedIndices,
          sourceId,
          spaceId,
          timestampField,
        });
      },
      onResolve: ({ datafeeds, jobs }) => {
        dispatchModuleStatus({ type: 'finishedSetup', datafeeds, jobs, spaceId, sourceId });
      },
      onReject: () => {
        dispatchModuleStatus({ type: 'failedSetup' });
      },
    },
    [moduleDescriptor.setUpModule, spaceId, sourceId, timestampField]
  );

  const [cleanUpModuleRequest, cleanUpModule] = useTrackedPromise(
    {
      cancelPreviousOn: 'resolution',
      createPromise: async () => {
        return await moduleDescriptor.cleanUpModule(spaceId, sourceId);
      },
    },
    [spaceId, sourceId]
  );

  const isCleaningUp = useMemo(() => cleanUpModuleRequest.state === 'pending', [
    cleanUpModuleRequest.state,
  ]);

  const cleanUpAndSetUpModule = useCallback(
    (selectedIndices: string[], start: number | undefined, end: number | undefined) => {
      dispatchModuleStatus({ type: 'startedSetup' });
      cleanUpModule()
        .then(() => {
          setUpModule(selectedIndices, start, end);
        })
        .catch(() => {
          dispatchModuleStatus({ type: 'failedSetup' });
        });
    },
    [cleanUpModule, dispatchModuleStatus, setUpModule]
  );

  const viewSetupForReconfiguration = useCallback(() => {
    dispatchModuleStatus({ type: 'requestedJobConfigurationUpdate' });
  }, [dispatchModuleStatus]);

  const viewSetupForUpdate = useCallback(() => {
    dispatchModuleStatus({ type: 'requestedJobDefinitionUpdate' });
  }, [dispatchModuleStatus]);

  const viewResults = useCallback(() => {
    dispatchModuleStatus({ type: 'viewedResults' });
  }, [dispatchModuleStatus]);

  const jobIds = useMemo(() => moduleDescriptor.getJobIds(spaceId, sourceId), [
    moduleDescriptor,
    spaceId,
    sourceId,
  ]);

  return {
    cleanUpAndSetUpModule,
    cleanUpModule,
    fetchJobStatus,
    fetchModuleDefinition,
    isCleaningUp,
    isLoadingModuleStatus,
    jobIds,
    jobStatus: moduleStatus.jobStatus,
    lastSetupErrorMessages: moduleStatus.lastSetupErrorMessages,
    moduleDescriptor,
    setUpModule,
    setupStatus: moduleStatus.setupStatus,
    sourceConfiguration,
    viewResults,
    viewSetupForReconfiguration,
    viewSetupForUpdate,
  };
};
