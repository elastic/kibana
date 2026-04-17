/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import type { Logger } from '@kbn/logging';
import {
  ESQLViewInitializer,
  type EsqlViewDefinition,
} from '../../lib/services/resource_service/esql_view_initializer';
import type { ResourceManagerContract } from '../../lib/services/resource_service/resource_manager';
import { getAlertEventsViewDefinition } from './alert_events';
import { getAlertActionsViewDefinition } from './alert_actions';
import { getAlertEpisodesViewDefinition } from './alert_episodes';

export interface RegisterEsqlViewsOptions {
  resourceManager: ResourceManagerContract;
  esClient: ElasticsearchClient;
  logger: Logger;
}

export function registerEsqlViews({
  resourceManager,
  esClient,
  logger,
}: RegisterEsqlViewsOptions): void {
  for (const viewDefinition of getEsqlViewDefinitions()) {
    const initializer = new ESQLViewInitializer(logger, esClient, viewDefinition);

    resourceManager.registerResource(viewDefinition.key, initializer, { optional: true });
  }
}

function getEsqlViewDefinitions(): EsqlViewDefinition[] {
  return [
    getAlertEventsViewDefinition(),
    getAlertActionsViewDefinition(),
    getAlertEpisodesViewDefinition(),
  ];
}
