/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import pMap from 'p-map';
import { useCallback, useRef } from 'react';
import type { WorkflowExecutionResult } from '../../../../hooks/use_onboarding_api';
import { useOnboardingApi } from '../../../../hooks/use_onboarding_api';

type StreamOnboardingStatusUpdateCallback = (
  streamName: string,
  status: WorkflowExecutionResult
) => void;

const NON_TERMINAL_STATUSES: ReadonlyArray<WorkflowExecutionResult['status']> = [
  'pending',
  'running',
];

export function useOnboardingStatusUpdateQueue(
  onStreamStatusUpdate: StreamOnboardingStatusUpdateCallback
) {
  const queue = useRef(new Set<string>([]));
  const isProcessing = useRef(false);

  const { getOnboardingExecution } = useOnboardingApi();

  const updateStatuses = useCallback(async (): Promise<void> => {
    await pMap(
      queue.current,
      async (streamName) => {
        const result = await getOnboardingExecution(streamName);

        onStreamStatusUpdate(streamName, result);

        if (!NON_TERMINAL_STATUSES.includes(result.status)) {
          queue.current.delete(streamName);
        }
      },
      { concurrency: 10 }
    );

    if (queue.current.size > 0) {
      await new Promise((res) => setTimeout(res, 2000));
      await updateStatuses();
    }
  }, [getOnboardingExecution, onStreamStatusUpdate]);

  const processStatusUpdateQueue = useCallback(async () => {
    if (isProcessing.current) {
      return;
    }

    isProcessing.current = true;

    return await updateStatuses().finally(() => {
      isProcessing.current = false;
    });
  }, [updateStatuses]);

  return { onboardingStatusUpdateQueue: queue.current, processStatusUpdateQueue };
}
