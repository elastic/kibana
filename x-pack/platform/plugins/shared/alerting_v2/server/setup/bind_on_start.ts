/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ContainerModuleLoadOptions } from 'inversify';
import { OnStart } from '@kbn/core-di';
import { ResourceManager } from '../lib/services/resource_service/resource_manager';
import { initializeResources } from '../resources/register_resources';
import { LoggerService } from '../lib/services/logger_service/logger_service';
import { EsServiceInternalToken } from '../lib/services/es_service/tokens';

export function bindOnStart({ bind }: ContainerModuleLoadOptions) {
  bind(OnStart).toConstantValue((container) => {
    const resourceManager = container.get(ResourceManager);
    const logger = container.get(LoggerService);
    const esClient = container.get(EsServiceInternalToken);

    initializeResources({
      logger,
      resourceManager,
      esClient,
    });
  });
}
