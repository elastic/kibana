/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { OnboardingResult, TaskResult } from '@kbn/streams-schema';
import { useOnboardingApi } from '../../../hooks/use_onboarding_api';
import { useStatusUpdateQueue } from './use_status_update_queue';

type StreamOnboardingStatusUpdateCallback = (
  streamName: string,
  status: TaskResult<OnboardingResult>
) => void;

export function useOnboardingStatusUpdateQueue(
  onStreamStatusUpdate: StreamOnboardingStatusUpdateCallback
) {
  const { getOnboardingTaskStatus } = useOnboardingApi();
  const { statusUpdateQueue, processStatusUpdateQueue } = useStatusUpdateQueue(
    getOnboardingTaskStatus,
    onStreamStatusUpdate
  );

  return { onboardingStatusUpdateQueue: statusUpdateQueue, processStatusUpdateQueue };
}
