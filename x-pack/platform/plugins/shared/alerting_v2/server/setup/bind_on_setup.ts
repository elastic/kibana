/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ContainerModuleLoadOptions } from 'inversify';
import { Logger, OnSetup, PluginSetup } from '@kbn/core-di';
import { CoreSetup, PluginInitializer } from '@kbn/core-di-server';
import { RuleExecutorTaskDefinition } from '../lib/rule_executor/task_definition';
import { registerFeaturePrivileges } from '../lib/security/privileges';
import { AlertingResourcesService } from '../lib/services/alerting_resources_service';
import type { PluginConfig } from '../config';
import { registerSavedObjects } from '../saved_objects';

export function bindOnSetup({ bind }: ContainerModuleLoadOptions) {
  bind(OnSetup).toConstantValue((container) => {
    const logger = container.get(Logger);
    const pluginConfig = container.get(PluginInitializer('config'));
    const alertingConfig = pluginConfig.get<PluginConfig>();

    registerFeaturePrivileges(container.get(PluginSetup('features')));

    registerSavedObjects({
      savedObjects: container.get(CoreSetup('savedObjects')),
      logger,
    });

    const resourcesService = container.get(AlertingResourcesService);
    resourcesService.startInitialization({
      enabled: alertingConfig.enabled,
    });

    container.get(RuleExecutorTaskDefinition).register();
  });
}
