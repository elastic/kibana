/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import type { TaskDefinitionRegistry } from '@kbn/task-manager-plugin/server';
import type { GetScopedClients } from '../../../routes/types';
import { createStreamsDescriptionGenerationTask } from './description_generation';
import { createStreamsInsightsDiscoveryTask } from '../../sig_events/tasks/insights_discovery';
import { createStreamsSignificantEventsQueriesGenerationTask } from '../../sig_events/tasks/significant_events_queries_generation';
import type { EbtTelemetryClient } from '../../telemetry';
import { createStreamsFeaturesIdentificationTask } from './features_identification';
import { createStreamsOnboardingTask } from './onboarding';
import { createStreamsMemoryGenerationTask } from './memory_generation';
import { createStreamsMemoryUpdateTask } from './memory_update';
import { createStreamsConversationScraperTask } from './conversation_scraper';
import { createStreamsMemoryConsolidationTask } from './memory_consolidation';

export interface TaskContext {
  logger: Logger;
  getScopedClients: GetScopedClients;
  telemetry: EbtTelemetryClient;
  getInternalEsClient: () => ElasticsearchClient;
}

export function createTaskDefinitions(taskContext: TaskContext) {
  return {
    ...createStreamsDescriptionGenerationTask(taskContext),
    ...createStreamsSignificantEventsQueriesGenerationTask(taskContext),
    ...createStreamsFeaturesIdentificationTask(taskContext),
    ...createStreamsInsightsDiscoveryTask(taskContext),
    ...createStreamsOnboardingTask(taskContext),
    ...createStreamsMemoryGenerationTask(taskContext),
    ...createStreamsMemoryUpdateTask(taskContext),
    ...createStreamsConversationScraperTask(taskContext),
    ...createStreamsMemoryConsolidationTask(taskContext),
  } satisfies TaskDefinitionRegistry;
}

export type StreamsTaskType = keyof ReturnType<typeof createTaskDefinitions>;
