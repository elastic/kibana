/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import createContainer from 'constate-latest';
import { useMemo } from 'react';
import { useTrackedPromise } from '../../../utils/use_tracked_promise';
import { callDeleteJobs, callStopDatafeed } from './api/ml_cleanup';

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
            return await callDeleteJobs(spaceId, sourceId);
          } else {
            throw err;
          }
        }
        return await callDeleteJobs(spaceId, sourceId);
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
