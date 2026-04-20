/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import type { OnboardingStep } from '@kbn/streams-schema';
import { StreamsAppLocatorDefinition } from '@kbn/streams-app-plugin/common/locators/streams_locator';
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
  saveQueries: boolean;
  steps: OnboardingStep[];
  connectors?: {
    features?: string;
    queries?: string;
  };
  taskClient: TaskClient<StreamsTaskType>;
  request: KibanaRequest;
}

interface StartKiIdentificationHandlerResult {
  url: string;
}

export async function startKiIdentificationToolHandler({
  streamName,
  saveQueries,
  steps,
  connectors,
  taskClient,
  request,
}: StartKiIdentificationHandlerParams): Promise<StartKiIdentificationHandlerResult> {
  const taskId = getOnboardingTaskId(streamName, saveQueries);

  await taskClient.schedule<OnboardingTaskParams>({
    task: {
      type: STREAMS_ONBOARDING_TASK_TYPE,
      id: taskId,
      space: '*',
    },
    params: {
      streamName,
      from: Date.now() - DEFAULT_LOOKBACK_MS,
      to: Date.now(),
      steps,
      saveQueries,
      connectors,
    },
    request,
  });

  const streamsLocator = new StreamsAppLocatorDefinition();
  const location = await streamsLocator.getLocation({
    name: streamName,
    managementTab: 'significantEvents',
  } as never);

  const origin = new URL(request.url).origin;

  return {
    url: `${origin}/app/${location.app}${location.path}`,
  };
}
