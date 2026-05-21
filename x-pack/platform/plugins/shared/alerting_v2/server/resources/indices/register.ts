/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import type { Logger } from '@kbn/logging';
import { IndexInitializer } from '../../lib/services/resource_service/index_initializer';
import type { ResourceManagerContract } from '../../lib/services/resource_service/resource_manager';
import type { IndexResourceDefinition } from './types';
import { getRuleDoctorInsightsResourceDefinition } from './rule_doctor_insights';

export interface RegisterIndicesOptions {
  resourceManager: ResourceManagerContract;
  esClient: ElasticsearchClient;
  logger: Logger;
}

export function registerIndices({
  resourceManager,
  esClient,
  logger,
}: RegisterIndicesOptions): void {
  for (const resourceDefinition of getIndexResourceDefinitions()) {
    const initializer = new IndexInitializer(logger, esClient, resourceDefinition);
    resourceManager.registerResource(resourceDefinition.key, initializer, { optional: true });
  }
}

function getIndexResourceDefinitions(): IndexResourceDefinition[] {
  return [getRuleDoctorInsightsResourceDefinition()];
}
