/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ContainerModuleLoadOptions } from 'inversify';
import type { CoreStart, PluginInitializerContext } from '@kbn/core/server';
import type { TaskManagerSetupContract } from '@kbn/task-manager-plugin/server';
import { Logger, OnSetup, PluginSetup } from '@kbn/core-di';
import { CoreSetup, PluginInitializer } from '@kbn/core-di-server';
import { initializeRuleExecutorTaskDefinition } from '../lib/rule_executor';
import { registerFeaturePrivileges } from '../lib/security/privileges';
import { AlertingResourcesService } from '../lib/services/alerting_resources_service';
import type { PluginConfig } from '../config';
import type { AlertingServerStartDependencies } from '../types';
import { registerSavedObjects } from '../saved_objects';

export function bindOnSetup({ bind }: ContainerModuleLoadOptions) {
  bind(OnSetup).toConstantValue((container) => {
    const logger = container.get(Logger);
    const pluginConfig = container.get(
      PluginInitializer('config')
    ) as PluginInitializerContext['config'];
    const alertingConfig = pluginConfig.get<PluginConfig>();

    // Register feature privileges
    registerFeaturePrivileges(container.get(PluginSetup('features')));

    // Saved Objects + Encrypted Saved Objects registration
    registerSavedObjects({
      savedObjects: container.get(CoreSetup('savedObjects')),
      logger,
    });

    // Task type registration
    const taskManagerSetup = container.get(PluginSetup<TaskManagerSetupContract>('taskManager'));
    const getStartServices = container.get(CoreSetup('getStartServices')) as () => Promise<
      [CoreStart, AlertingServerStartDependencies, unknown]
    >;
    const startServices = getStartServices();

    const resourcesService = container.get(AlertingResourcesService);
    resourcesService.startInitialization({
      enabled: alertingConfig.enabled,
    });

    initializeRuleExecutorTaskDefinition(
      logger,
      taskManagerSetup,
      startServices,
      alertingConfig,
      resourcesService
    );
  });
}
