/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useMemo } from 'react';

import { getJobId } from '../../../../common/log_analysis';
import { useTrackedPromise } from '../../../utils/use_tracked_promise';
import { callDeleteJobs, callGetJobDeletionTasks, callStopDatafeeds } from './api/ml_cleanup';

export const useLogAnalysisCleanup = <JobType extends string>({
  sourceId,
  spaceId,
  jobTypes,
}: {
  sourceId: string;
  spaceId: string;
  jobTypes: JobType[];
}) => {
  const [cleanupMLResourcesRequest, cleanupMLResources] = useTrackedPromise(
    {
      cancelPreviousOn: 'resolution',
      createPromise: async () => {
        try {
          await callStopDatafeeds(spaceId, sourceId, jobTypes);
        } catch (err) {
          // Proceed only if datafeed has been deleted or didn't exist in the first place
          if (err?.res?.status !== 404) {
            throw err;
          }
        }

        return await deleteJobs(spaceId, sourceId, jobTypes);
      },
    },
    [spaceId, sourceId]
  );

  const isCleaningUp = useMemo(() => cleanupMLResourcesRequest.state === 'pending', [
    cleanupMLResourcesRequest.state,
  ]);

  return {
    cleanupMLResources,
    isCleaningUp,
  };
};

const deleteJobs = async <JobType extends string>(
  spaceId: string,
  sourceId: string,
  jobTypes: JobType[]
) => {
  const deleteJobsResponse = await callDeleteJobs(spaceId, sourceId, jobTypes);
  await waitUntilJobsAreDeleted(spaceId, sourceId, jobTypes);
  return deleteJobsResponse;
};

const waitUntilJobsAreDeleted = async <JobType extends string>(
  spaceId: string,
  sourceId: string,
  jobTypes: JobType[]
) => {
  const moduleJobIds = jobTypes.map(jobType => getJobId(spaceId, sourceId, jobType));
  while (true) {
    const { jobIds: jobIdsBeingDeleted } = await callGetJobDeletionTasks();
    const needToWait = jobIdsBeingDeleted.some(jobId => moduleJobIds.includes(jobId));

    if (needToWait) {
      await timeout(1000);
    } else {
      return true;
    }
  }
};

const timeout = (ms: number) => new Promise(res => setTimeout(res, ms));
