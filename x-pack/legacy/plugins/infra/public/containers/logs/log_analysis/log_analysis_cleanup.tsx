/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import createContainer from 'constate-latest';
import { useMemo } from 'react';
import { useTrackedPromise } from '../../../utils/use_tracked_promise';
import { callDeleteJobs, callStopDatafeed, callGetJobDeletionTasks } from './api/ml_cleanup';
import { getAllModuleJobIds } from '../../../../common/log_analysis';

export const useLogAnalysisCleanup = ({
  sourceId,
  spaceId,
}: {
  sourceId: string;
  spaceId: string;
}) => {
  const [cleanupMLResourcesRequest, cleanupMLResources] = useTrackedPromise(
    {
      cancelPreviousOn: 'resolution',
      createPromise: async () => {
        try {
          await callStopDatafeed(spaceId, sourceId);
        } catch (err) {
          // Datefeed has been deleted / doesn't exist, proceed with deleting jobs anyway
          if (err && err.res && err.res.status === 404) {
            return await deleteJobs(spaceId, sourceId);
          } else {
            throw err;
          }
        }

        return await deleteJobs(spaceId, sourceId);
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

export const LogAnalysisCleanup = createContainer(useLogAnalysisCleanup);

const deleteJobs = async (spaceId: string, sourceId: string) => {
  await callDeleteJobs(spaceId, sourceId);
  return await waitUntilJobsAreDeleted(spaceId, sourceId);
};

const waitUntilJobsAreDeleted = async (spaceId: string, sourceId: string) => {
  while (true) {
    const response = await callGetJobDeletionTasks();
    const jobIdsBeingDeleted = response.jobIds;
    const moduleJobIds = getAllModuleJobIds(spaceId, sourceId);
    const needToWait = jobIdsBeingDeleted.some(jobId => moduleJobIds.includes(jobId));
    if (needToWait) {
      await timeout(1000);
    } else {
      return true;
    }
  }
};

const timeout = (ms: number) => new Promise(res => setTimeout(res, ms));
