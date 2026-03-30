/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type { TaskDefinitionRegistry } from '@kbn/task-manager-plugin/server';
import type { GetScopedClients } from '../../../routes/types';
import { createStreamsDescriptionGenerationTask } from './description_generation';
import { createStreamsInsightsDiscoveryTask } from '../../sig_events/tasks/insights_discovery';
import { createStreamsSignificantEventsQueriesGenerationTask } from '../../sig_events/tasks/significant_events_queries_generation';
import type { EbtTelemetryClient } from '../../telemetry';
import { createStreamsFeaturesIdentificationTask } from './features_identification';
import { createStreamsOnboardingTask } from './onboarding';

export interface TaskContext {
  logger: Logger;
  getScopedClients: GetScopedClients;
  telemetry: EbtTelemetryClient;
}

export function createTaskDefinitions(taskContext: TaskContext) {
  return {
    ...createStreamsDescriptionGenerationTask(taskContext),
    ...createStreamsSignificantEventsQueriesGenerationTask(taskContext),
    ...createStreamsFeaturesIdentificationTask(taskContext),
    ...createStreamsInsightsDiscoveryTask(taskContext),
    ...createStreamsOnboardingTask(taskContext),
  } satisfies TaskDefinitionRegistry;
}

export type StreamsTaskType = keyof ReturnType<typeof createTaskDefinitions>;
