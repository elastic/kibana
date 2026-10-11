/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import type { Logger } from '@kbn/logging';
import type { ChangeHistoryClient } from '@kbn/change-history';
import type { ResourceManagerContract } from '../lib/services/resource_service/resource_manager';
import {
  RuleChangesHistoryInitializer,
  RULE_CHANGES_HISTORY_RESOURCE_KEY,
} from '../lib/rule_changes_history';
import { registerDatastreams } from './datastreams/register';
import { registerEsqlViews } from './esql_views/register';

export interface InitializeResourcesOptions {
  resourceManager: ResourceManagerContract;
  esClient: ElasticsearchClient;
  coreLogger: Logger;
  changeHistoryClient: ChangeHistoryClient;
}

export function initializeResources({
  resourceManager,
  esClient,
  coreLogger,
  changeHistoryClient,
}: InitializeResourcesOptions): void {
  registerDatastreams({ resourceManager, esClient, logger: coreLogger });
  registerEsqlViews({ resourceManager, esClient, logger: coreLogger });

  resourceManager.registerResource(
    RULE_CHANGES_HISTORY_RESOURCE_KEY,
    new RuleChangesHistoryInitializer(changeHistoryClient, esClient),
    { optional: true }
  );

  resourceManager.startInitialization();
}
