/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import type { OnboardingStep } from '@kbn/streams-schema';
import { getStreamsLocation } from '../../../../common/get_streams_location/get_streams_location';
import type { TaskClient } from '../../../lib/tasks/task_client';
import type { StreamsTaskType } from '../../../lib/tasks/task_definitions';
import {
  getOnboardingTaskId,
  STREAMS_ONBOARDING_TASK_TYPE,
  type OnboardingTaskParams,
} from '../../../lib/tasks/task_definitions/onboarding';

const DEFAULT_LOOKBACK_MS = 24 * 60 * 60 * 1000;

interface StartKiIdentificationHandlerParams {
  streamName: string;
  steps: OnboardingStep[];
  connectors?: {
    features?: string;
    queries?: string;
  };
  taskClient: TaskClient<StreamsTaskType>;
  request: KibanaRequest;
}

interface StartKiIdentificationHandlerResult {
  kibanaPath: string;
}

export async function startKiIdentificationToolHandler({
  streamName,
  steps,
  connectors,
  taskClient,
  request,
}: StartKiIdentificationHandlerParams): Promise<StartKiIdentificationHandlerResult> {
  const taskId = getOnboardingTaskId(streamName);
  const now = Date.now();

  await taskClient.schedule<OnboardingTaskParams>({
    task: {
      type: STREAMS_ONBOARDING_TASK_TYPE,
      id: taskId,
      space: '*',
    },
    params: {
      streamName,
      from: now - DEFAULT_LOOKBACK_MS,
      to: now,
      steps,
      connectors,
    },
    request,
  });

  const location = getStreamsLocation({
    name: streamName,
    managementTab: 'significantEvents',
  });

  return {
    kibanaPath: `/app/${location.app}${location.path}`,
  };
}
