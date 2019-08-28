/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import createContainer from 'constate-latest';
import { useMemo } from 'react';
import { useTrackedPromise } from '../../../utils/use_tracked_promise';
import { callCleanupMLResources } from './api/ml_cleanup_everything';

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
        return await callCleanupMLResources(spaceId, sourceId);
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
