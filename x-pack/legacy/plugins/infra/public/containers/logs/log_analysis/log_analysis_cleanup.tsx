/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import createContainer from 'constate-latest';
import { useCallback } from 'react';
import { useTrackedPromise } from '../../../utils/use_tracked_promise';
import { callDeleteJobs, callStopDatafeed } from './api/ml_cleanup';

export const useLogAnalysisCleanup = ({
  sourceId,
  spaceId,
}: {
  sourceId: string;
  spaceId: string;
}) => {
  const [deleteJobsRequest, deleteJobs] = useTrackedPromise(
    {
      cancelPreviousOn: 'resolution',
      createPromise: async () => {
        return await callDeleteJobs(spaceId, sourceId);
      },
    },
    [spaceId, sourceId]
  );

  const [stopDatefeedRequest, stopDatafeed] = useTrackedPromise(
    {
      cancelPreviousOn: 'resolution',
      createPromise: async () => {
        return await callStopDatafeed(spaceId, sourceId);
      },
    },
    [spaceId, sourceId]
  );

  const cleanupMLResources = useCallback(async () => {
    return stopDatafeed().then(
      () => {
        return deleteJobs();
      },
      err => {
        // Datafeed has been deleted, or just doesn't exist, proceed with deleting jobs anyway
        if (err && err.res && err.res.status === 404) {
          return deleteJobs();
        } else {
          throw err;
        }
      }
    );
  }, [stopDatafeed, deleteJobs]);

  return {
    deleteJobsRequest,
    deleteJobs,
    stopDatefeedRequest,
    stopDatafeed,
    cleanupMLResources,
  };
};

export const LogAnalysisCleanup = createContainer(useLogAnalysisCleanup);
