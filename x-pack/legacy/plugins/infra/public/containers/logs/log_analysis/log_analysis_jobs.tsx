/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import createContainer from 'constate';
import { useMemo, useCallback, useEffect, useState } from 'react';

import { callGetMlModuleAPI } from './api/ml_get_module';
import { bucketSpan, getJobId } from '../../../../common/log_analysis';
import { ValidationIndicesError } from '../../../../common/http_api';
import { useTrackedPromise } from '../../../utils/use_tracked_promise';
import { callJobsSummaryAPI } from './api/ml_get_jobs_summary_api';
import { callSetupMlModuleAPI, SetupMlModuleResponsePayload } from './api/ml_setup_module_api';
import { useLogAnalysisCleanup } from './log_analysis_cleanup';
import { useStatusState } from './log_analysis_status_state';
import { callIndexPatternsValidate } from './api/index_patterns_validate';

export interface AvailableIndex {
  index: string;
  validation?: ValidationIndicesError;
}

const MODULE_ID = 'logs_ui_analysis';

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
  const [statusState, dispatch] = useStatusState({
    bucketSpan,
    indexPattern,
    timestampField: timeField,
  });

  const [fetchModuleDefinitionRequest, fetchModuleDefinition] = useTrackedPromise(
    {
      cancelPreviousOn: 'resolution',
      createPromise: async () => {
        dispatch({ type: 'fetchingModuleDefinition' });
        return await callGetMlModuleAPI(MODULE_ID);
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
          MODULE_ID,
          start,
          end,
          spaceId,
          sourceId,
          indices.join(','),
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
    [spaceId, sourceId, timeField, bucketSpan]
  );

  const indexPatterns = indexPattern.split(',');

  const [availableIndices, setAvailableIndices] = useState<AvailableIndex[]>(
    indexPatterns.map<AvailableIndex>(pattern => ({ index: pattern }))
  );

  const [fetchJobStatusRequest, fetchJobStatus] = useTrackedPromise(
    {
      cancelPreviousOn: 'resolution',
      createPromise: async () => {
        dispatch({ type: 'fetchingJobStatuses' });
        return Promise.all([
          callJobsSummaryAPI(spaceId, sourceId),
          callIndexPatternsValidate(timeField, indexPattern),
        ]);
      },
      onResolve: ([jobResponse, validationResponse]) => {
        setAvailableIndices(
          indexPatterns.map<AvailableIndex>(pattern => {
            const indexValidation = validationResponse.data.errors.find(
              err => err.index === pattern
            );
            return { index: pattern, validation: indexValidation };
          })
        );
        dispatch({ type: 'fetchedJobStatuses', payload: jobResponse, spaceId, sourceId });
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
    return {
      'log-entry-rate': getJobId(spaceId, sourceId, 'log-entry-rate'),
    };
  }, [sourceId, spaceId]);

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

export const LogAnalysisJobs = createContainer(useLogAnalysisJobs);
