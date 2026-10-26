/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import type { Logger } from '@kbn/logging';
import type { RetentionConfig } from '../../config';
import { DatastreamInitializer } from '../../lib/services/resource_service/datastream_initializer';
import type { ResourceManagerContract } from '../../lib/services/resource_service/resource_manager';
import { getAlertActionsResourceDefinition } from './alert_actions';
import { getAlertEventsResourceDefinition } from './alert_events';
import type { ResourceDefinition } from './types';

export interface RegisterDatastreamsOptions {
  resourceManager: ResourceManagerContract;
  esClient: ElasticsearchClient;
  logger: Logger;
  retention: RetentionConfig;
}

export function registerDatastreams({
  resourceManager,
  esClient,
  logger,
  retention,
}: RegisterDatastreamsOptions): void {
  for (const resourceDefinition of getDataStreamResourceDefinitions(retention)) {
    const initializer = new DatastreamInitializer(logger, esClient, resourceDefinition);

    resourceManager.registerResource(resourceDefinition.key, initializer);
  }
}

export function getDataStreamResourceDefinitions({
  ruleEvents,
}: RetentionConfig): ResourceDefinition[] {
  return [
    getAlertEventsResourceDefinition({
      dataRetention: ruleEvents.enabled ? ruleEvents.dataRetention : undefined,
    }),
    getAlertActionsResourceDefinition(),
  ];
}
