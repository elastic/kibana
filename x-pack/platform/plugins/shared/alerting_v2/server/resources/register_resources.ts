/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import type { Logger } from '@kbn/logging';
import type { ResourceManagerContract } from '../lib/services/resource_service/resource_manager';
import { registerDatastreams } from './datastreams/register';
import { registerEsqlViews } from './esql_views/register';

export interface InitializeResourcesOptions {
  resourceManager: ResourceManagerContract;
  esClient: ElasticsearchClient;
  logger: Logger;
}

export function initializeResources({
  resourceManager,
  esClient,
  logger,
}: InitializeResourcesOptions): void {
  registerDatastreams({ resourceManager, esClient, logger });
  registerEsqlViews({ resourceManager, esClient, logger });

  resourceManager.startInitialization();
}
