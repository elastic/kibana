/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IdentifyFeaturesResult, TaskResult } from '@kbn/streams-schema';
import { TaskStatus } from '@kbn/streams-schema';
import pMap from 'p-map';
import { useCallback, useRef } from 'react';
import { useFeaturesQueriesSubtaskApi } from '../../../hooks/use_features_queries_subtask_api';

type StreamFeaturesStatusUpdateCallback = (
  streamName: string,
  status: TaskResult<IdentifyFeaturesResult>
) => void;

export function useFeaturesIdentificationStatusUpdateQueue(
  onStreamStatusUpdate: StreamFeaturesStatusUpdateCallback
) {
  const queue = useRef(new Set<string>([]));
  const isProcessing = useRef(false);

  const { getFeaturesIdentificationStatus } = useFeaturesQueriesSubtaskApi();

  const updateStatuses = useCallback(async (): Promise<void> => {
    await pMap(
      queue.current,
      async (streamName) => {
        const taskResult = await getFeaturesIdentificationStatus(streamName);
        onStreamStatusUpdate(streamName, taskResult);

        if (![TaskStatus.InProgress, TaskStatus.BeingCanceled].includes(taskResult.status)) {
          queue.current.delete(streamName);
        }
      },
      { concurrency: 10 }
    );

    if (queue.current.size > 0) {
      await new Promise((res) => setTimeout(res, 2000));
      await updateStatuses();
    }
  }, [getFeaturesIdentificationStatus, onStreamStatusUpdate]);

  const processStatusUpdateQueue = useCallback(async () => {
    if (isProcessing.current) {
      return;
    }

    isProcessing.current = true;

    return await updateStatuses().finally(() => {
      isProcessing.current = false;
    });
  }, [updateStatuses]);

  return { featuresIdentificationStatusUpdateQueue: queue.current, processStatusUpdateQueue };
}
