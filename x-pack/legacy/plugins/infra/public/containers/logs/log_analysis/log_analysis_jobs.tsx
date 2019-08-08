/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import createContainer from 'constate-latest';
import { useMemo, useEffect, useState } from 'react';
import { kfetch } from 'ui/kfetch';
import { values } from 'lodash';
import { getJobId, getJobIdPrefix } from '../../../../common/log_analysis';
import { throwErrors, createPlainError } from '../../../../common/runtime_types';
import { useTrackedPromise } from '../../../utils/use_tracked_promise';
import {
  setupMlModuleRequestPayloadRT,
  fetchJobStatusRequestPayloadRT,
  fetchJobStatusResponsePayloadRT,
} from './ml_api_types';

type JobStatus = 'unknown' | 'querying' | 'missing' | 'creating' | 'running' | 'inconsistent';

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
        const response = await kfetch({
          method: 'POST',
          pathname: '/api/ml/jobs/jobs_summary',
          body: JSON.stringify(
            fetchJobStatusRequestPayloadRT.encode({
              jobIds: [getJobId(spaceId, sourceId, 'log-entry-rate')],
            })
          ),
        });
        return fetchJobStatusResponsePayloadRT
          .decode(response)
          .getOrElseL(throwErrors(createPlainError));
      },
      onResolve: response => {
        if (response && response.length) {
          const logEntryRate = response.find(
            job => job.id === getJobId(spaceId, sourceId, 'log-entry-rate')
          );
          setJobStatus({
            logEntryRate: logEntryRate ? (logEntryRate.jobState as JobStatus) : 'unknown',
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
    const badStates = jobStates.filter(state => {
      return state === 'unknown' || state === 'missing' || state === 'inconsistent';
    });
    return badStates.length > 0;
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
