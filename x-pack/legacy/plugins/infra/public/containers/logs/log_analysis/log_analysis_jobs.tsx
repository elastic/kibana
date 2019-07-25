/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import createContainer from 'constate-latest/dist/ts/src';
import { useMemo, useState } from 'react';
import { kfetch } from 'ui/kfetch';

import {
  createJobsRequestPayloadRT,
  createJobsSuccessReponsePayloadRT,
  JobDescriptor,
  LOG_ANALYSIS_CREATE_JOBS_PATH,
} from '../../../../common/http_api/log_analysis';
import { createPlainError, throwErrors } from '../../../../common/runtime_types';
import { useTrackedPromise } from '../../../utils/use_tracked_promise';

export const useLogAnalysisJobManagement = ({ sourceId }: { sourceId: string }) => {
  const [jobStatus, setJobStatus] = useState<JobDescriptor[]>([]);

  const [createJobsRequest, createJobs] = useTrackedPromise(
    {
      cancelPreviousOn: 'resolution',
      createPromise: async () => {
        return await kfetch({
          method: 'POST',
          pathname: LOG_ANALYSIS_CREATE_JOBS_PATH,
          body: JSON.stringify(
            createJobsRequestPayloadRT.encode({
              data: {
                sourceId,
                categorizationFieldName: 'message',
                timeRange: {
                  startTime: Date.now(),
                  endTime: Date.now() + 1000 * 60 * 60,
                },
              },
            })
          ),
        });
      },
      onResolve: response => {
        const {
          data: { jobs },
        } = createJobsSuccessReponsePayloadRT
          .decode(response)
          .getOrElseL(throwErrors(createPlainError));

        setJobStatus(jobs);
      },
    },
    [sourceId]
  );

  const isLoading = useMemo(() => createJobsRequest.state === 'pending', [createJobsRequest.state]);

  return {
    createJobs,
    jobStatus,
    isLoading,
  };
};

export const LogAnalysisJobManagement = createContainer(useLogAnalysisJobManagement);
