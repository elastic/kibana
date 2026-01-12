/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import { getAlertEventsResourceDefinition } from './alert_events';
import { ResourceInitializer } from '../lib/services/resource_service/resource_initializer';
import type { ResourcesService } from '../lib/services/resource_service/resources_service';
import type { ResourceDefinition } from './types';

export interface RegisterResourcesOptions {
  resourcesService: ResourcesService;
  esClient: ElasticsearchClient;
}

export function registerResources({ resourcesService, esClient }: RegisterResourcesOptions): void {
  for (const resourceDefinition of getDataStreamResourceDefinitions()) {
    const initializer = new ResourceInitializer(esClient, resourceDefinition);

    resourcesService.registerResource(resourceDefinition.key, initializer);
  }
}

function getDataStreamResourceDefinitions(): ResourceDefinition[] {
  return [getAlertEventsResourceDefinition()];
}
