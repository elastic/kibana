/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import createContainer from 'constate';
import { useMemo, useCallback, useEffect } from 'react';

import { callGetMlModuleAPI } from './api/ml_get_module';
import { bucketSpan, getJobId } from '../../../../common/log_analysis';
import { useTrackedPromise } from '../../../utils/use_tracked_promise';
import { callJobsSummaryAPI } from './api/ml_get_jobs_summary_api';
import { callSetupMlModuleAPI, SetupMlModuleResponsePayload } from './api/ml_setup_module_api';
import { useLogAnalysisCleanup } from './log_analysis_cleanup';
import { useStatusState } from './log_analysis_status_state';

const MODULE_ID = 'logs_ui_analysis';
const SAMPLE_DATA_INDEX = 'kibana_sample_data_logs*';

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
  const filteredIndexPattern = useMemo(() => removeSampleDataIndex(indexPattern), [indexPattern]);
  const { cleanupMLResources } = useLogAnalysisCleanup({ sourceId, spaceId });
  const [statusState, dispatch] = useStatusState({
    bucketSpan,
    indexPattern: filteredIndexPattern,
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
      createPromise: async (start, end) => {
        dispatch({ type: 'startedSetup' });
        return await callSetupMlModuleAPI(
          MODULE_ID,
          start,
          end,
          spaceId,
          sourceId,
          filteredIndexPattern,
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
    [filteredIndexPattern, spaceId, sourceId, timeField, bucketSpan]
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
    [filteredIndexPattern, spaceId, sourceId]
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
    fetchJobStatus,
    isLoadingSetupStatus,
    jobStatus: statusState.jobStatus,
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
//
// This is needed due to: https://github.com/elastic/kibana/issues/43671
const removeSampleDataIndex = (indexPattern: string) => {
  return indexPattern
    .split(',')
    .filter(index => index !== SAMPLE_DATA_INDEX)
    .join(',');
};
