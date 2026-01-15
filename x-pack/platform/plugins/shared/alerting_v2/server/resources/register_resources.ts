/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import { getAlertEventsResourceDefinition } from './alert_events';
import { ResourceInitializer } from '../lib/services/resource_service/resource_initializer';
import type { ResourceManager } from '../lib/services/resource_service/resource_manager';
import type { ResourceDefinition } from './types';
import { getAlertTransitionsResourceDefinition } from './alert_transitions';
import { getAlertActionsResourceDefinition } from './alert_actions';
import type { LoggerService } from '../lib/services/logger_service/logger_service';

export interface RegisterResourcesOptions {
  resourceManager: ResourceManager;
  esClient: ElasticsearchClient;
  logger: LoggerService;
}

export function initializeResources({
  resourceManager,
  esClient,
  logger,
}: RegisterResourcesOptions): void {
  for (const resourceDefinition of getDataStreamResourceDefinitions()) {
    const initializer = new ResourceInitializer(logger, esClient, resourceDefinition);

    resourceManager.registerResource(resourceDefinition.key, initializer);
  }

  resourceManager.startInitialization();
}

function getDataStreamResourceDefinitions(): ResourceDefinition[] {
  return [
    getAlertEventsResourceDefinition(),
    getAlertTransitionsResourceDefinition(),
    getAlertActionsResourceDefinition(),
  ];
}
