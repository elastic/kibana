/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SignificantEventsQueriesGenerationResult, TaskResult } from '@kbn/streams-schema';
import { TaskStatus } from '@kbn/streams-schema';
import pMap from 'p-map';
import { useCallback, useRef } from 'react';
import { useFeaturesQueriesSubtaskApi } from '../../../hooks/use_features_queries_subtask_api';

type StreamQueriesGenerationStatusUpdateCallback = (
  streamName: string,
  status: TaskResult<SignificantEventsQueriesGenerationResult>
) => void;

export function useQueriesGenerationStatusUpdateQueue(
  onStreamStatusUpdate: StreamQueriesGenerationStatusUpdateCallback
) {
  const queue = useRef(new Set<string>([]));
  const isProcessing = useRef(false);

  const { getQueriesGenerationStatus } = useFeaturesQueriesSubtaskApi();

  const updateStatuses = useCallback(async (): Promise<void> => {
    await pMap(
      queue.current,
      async (streamName) => {
        const taskResult = await getQueriesGenerationStatus(streamName);
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
  }, [getQueriesGenerationStatus, onStreamStatusUpdate]);

  const processStatusUpdateQueue = useCallback(async () => {
    if (isProcessing.current) {
      return;
    }

    isProcessing.current = true;

    return await updateStatuses().finally(() => {
      isProcessing.current = false;
    });
  }, [updateStatuses]);

  return { queriesGenerationStatusUpdateQueue: queue.current, processStatusUpdateQueue };
}
