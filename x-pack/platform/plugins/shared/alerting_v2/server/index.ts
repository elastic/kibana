/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Logger, OnSetup, PluginSetup } from '@kbn/core-di';
import { CoreSetup, PluginInitializer, Route } from '@kbn/core-di-server';
import type { CoreStart, PluginConfigDescriptor, PluginInitializerContext } from '@kbn/core/server';
import type { TaskManagerSetupContract } from '@kbn/task-manager-plugin/server';
import { ContainerModule } from 'inversify';
import { RulesClient } from './lib/rules_client';
import type { PluginConfig } from './config';
import { configSchema } from './config';
import { AlertingRetryService } from './lib/services/retry_service';
import { registerFeaturePrivileges } from './lib/security/privileges';
import { CreateRuleRoute } from './routes/create_rule_route';
import { UpdateRuleRoute } from './routes/update_rule_route';
import { initializeRuleExecutorTaskDefinition } from './lib/rule_executor';
import { AlertingResourcesService } from './lib/services/alerting_resources_service';
import { LoggerService } from './lib/services/logger_service';
import { QueryServiceFactory } from './lib/services/query_service/query_service_factory';
import { StorageServiceFactory } from './lib/services/storage_service/storage_service_factory';
import { registerSavedObjects } from './saved_objects';
import type { AlertingServerStartDependencies } from './types';

export const config: PluginConfigDescriptor<PluginConfig> = {
  schema: configSchema,
};

export const module = new ContainerModule(({ bind }) => {
  bind(Route).toConstantValue(CreateRuleRoute);
  bind(Route).toConstantValue(UpdateRuleRoute);

  bind(RulesClient).toSelf().inRequestScope();

  bind(AlertingRetryService).toSelf().inSingletonScope();
  bind(AlertingResourcesService).toSelf().inSingletonScope();
  bind(LoggerService).toSelf().inSingletonScope();
  bind(QueryServiceFactory).toSelf().inSingletonScope();
  bind(StorageServiceFactory).toSelf().inSingletonScope();

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
});

export type { PluginConfig as AlertingV2Config } from './config';
