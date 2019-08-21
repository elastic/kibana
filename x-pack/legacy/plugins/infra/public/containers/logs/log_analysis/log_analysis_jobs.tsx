/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import createContainer from 'constate-latest';
import { useMemo, useEffect, useState } from 'react';
import { values } from 'lodash';
import { getJobId } from '../../../../common/log_analysis';
import { useTrackedPromise } from '../../../utils/use_tracked_promise';
import { callJobsSummaryAPI } from './api/ml_get_jobs_summary_api';

type JobStatus = 'unknown' | 'closed' | 'closing' | 'failed' | 'opened' | 'opening' | 'deleted';
// type DatafeedStatus = 'unknown' | 'started' | 'starting' | 'stopped' | 'stopping' | 'deleted';

export const useLogAnalysisJobs = ({
  indexPattern,
  sourceId,
  spaceId,
}: {
  indexPattern: string;
  sourceId: string;
  spaceId: string;
}) => {
  const [jobStatus, setJobStatus] = useState<{
    logEntryRate: JobStatus;
  }>({
    logEntryRate: 'unknown',
  });

  // const [setupMlModuleRequest, setupMlModule] = useTrackedPromise(
  //   {
  //     cancelPreviousOn: 'resolution',
  //     createPromise: async () => {
  //       kfetch({
  //         method: 'POST',
  //         pathname: '/api/ml/modules/setup',
  //         body: JSON.stringify(
  //           setupMlModuleRequestPayloadRT.encode({
  //             indexPatternName: indexPattern,
  //             prefix: getJobIdPrefix(spaceId, sourceId),
  //             startDatafeed: true,
  //           })
  //         ),
  //       });
  //     },
  //   },
  //   [indexPattern, spaceId, sourceId]
  // );

  const [fetchJobStatusRequest, fetchJobStatus] = useTrackedPromise(
    {
      cancelPreviousOn: 'resolution',
      createPromise: async () => {
        return callJobsSummaryAPI(spaceId, sourceId);
      },
      onResolve: response => {
        if (response && response.length) {
          const logEntryRate = response.find(
            (job: any) => job.id === getJobId(spaceId, sourceId, 'log-entry-rate')
          );
          setJobStatus({
            logEntryRate: logEntryRate ? logEntryRate.jobState : 'unknown',
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

  const isSetupRequired = useMemo(() => {
    const jobStates = values(jobStatus);
    return (
      jobStates.filter(state => state === 'opened' || state === 'opening').length < jobStates.length
    );
  }, [jobStatus]);

  const isLoadingSetupStatus = useMemo(() => fetchJobStatusRequest.state === 'pending', [
    fetchJobStatusRequest.state,
  ]);

  return {
    jobStatus,
    isSetupRequired,
    isLoadingSetupStatus,
  };
};

export const LogAnalysisJobs = createContainer(useLogAnalysisJobs);
