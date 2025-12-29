/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PluginConfigDescriptor, PluginInitializerContext } from '@kbn/core/server';
import { ContainerModule } from 'inversify';
import { Logger, OnSetup, PluginSetup } from '@kbn/core-di';
import { CoreSetup, PluginInitializer, Route } from '@kbn/core-di-server';
import type { TaskManagerSetupContract } from '@kbn/task-manager-plugin/server';

import type { AlertingV2Config } from './config';
import { configSchema } from './config';
import { setupSavedObjects } from './saved_objects';
import { initializeRuleExecutorTaskDefinition } from './rule_executor';
import { CreateEsqlRuleRoute } from './routes/esql_rule/routes/create_esql_rule_route';
import { UpdateEsqlRuleRoute } from './routes/esql_rule/routes/update_esql_rule_route';
import { registerFeaturePrivileges } from './lib/security/privileges';

export const config: PluginConfigDescriptor<AlertingV2Config> = {
  schema: configSchema,
};

export const module = new ContainerModule(({ bind }) => {
  // Register HTTP routes via DI
  bind(Route).toConstantValue(CreateEsqlRuleRoute);
  bind(Route).toConstantValue(UpdateEsqlRuleRoute);

  bind(OnSetup).toConstantValue((container) => {
    const logger = container.get(Logger);
    const pluginConfig = container.get(
      PluginInitializer('config')
    ) as PluginInitializerContext['config'];
    const alertingConfig = pluginConfig.get<AlertingV2Config>();

    // Register feature privileges
    registerFeaturePrivileges(container.get(PluginSetup('features')));

    // Saved Objects + Encrypted Saved Objects registration
    setupSavedObjects({
      savedObjects: container.get(CoreSetup('savedObjects')),
      encryptedSavedObjects: container.get(PluginSetup('encryptedSavedObjects')),
      logger,
    });

    // Task type registration
    const taskManagerSetup = container.get(PluginSetup<TaskManagerSetupContract>('taskManager'));
    const getStartServices = container.get(CoreSetup('getStartServices')) as () => Promise<
      [unknown, unknown, unknown]
    >;
    initializeRuleExecutorTaskDefinition(
      logger,
      taskManagerSetup,
      getStartServices() as any,
      alertingConfig
    );
  });
});

export type { AlertingV2Config } from './config';
