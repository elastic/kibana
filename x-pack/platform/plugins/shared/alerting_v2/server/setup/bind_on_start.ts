/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ContainerModuleLoadOptions } from 'inversify';
import { OnStart } from '@kbn/core-di';
import { CoreStart } from '@kbn/core-di-server';
import { ResourceManager } from '../lib/services/resource_service/resource_manager';
import { registerResources } from '../resources/register_resources';

export function bindOnStart({ bind }: ContainerModuleLoadOptions) {
  bind(OnStart).toConstantValue((container) => {
    const resourceManager = container.get(ResourceManager);
    const esClient = container.get(CoreStart('elasticsearch')).client.asInternalUser;

    registerResources({
      resourceManager,
      esClient,
    });

    resourceManager.startInitialization();
  });
}
