/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import createContainer from 'constate-latest';
import { useMemo, useState } from 'react';
import { kfetch } from 'ui/kfetch';

import { getJobIdPrefix } from '../../../../common/log_analysis';
import { useTrackedPromise } from '../../../utils/use_tracked_promise';
import { setupMlModuleRequestPayloadRT } from './ml_api_types';

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
        kfetch({
          method: 'POST',
          pathname: '/api/ml/jobs/jobs_summary',
        });
      },
    },
    [indexPattern, spaceId, sourceId]
  );

  return {
    jobStatus,
  };
};

export const LogAnalysisJobs = createContainer(useLogAnalysisJobs);
