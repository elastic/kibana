/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import type { Logger } from '@kbn/logging';
import { ESQLViewInitializer } from '../lib/services/esql_views_service/esql_view_initializer';
import type { EsqlViewDefinition } from '../lib/services/esql_views_service/types';
import { getAlertEventsViewDefinition } from './alert_events';
import { getAlertActionsViewDefinition } from './alert_actions';
import { getAlertEpisodesViewDefinition } from './alert_episodes';

export interface RegisterViewsOptions {
  esClient: ElasticsearchClient;
  logger: Logger;
}

export function initializeESQLViews({ esClient, logger }: RegisterViewsOptions): void {
  const viewDefinitions = getEsqlViewDefinitions();
  const viewInitializer = new ESQLViewInitializer(logger, esClient);

  viewInitializer.startInitialization({ viewDefinitions });
}

function getEsqlViewDefinitions(): EsqlViewDefinition[] {
  return [
    getAlertEventsViewDefinition(),
    getAlertActionsViewDefinition(),
    getAlertEpisodesViewDefinition(),
  ];
}
