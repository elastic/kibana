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

import type { PluginConfig } from './config';
import { configSchema } from './config';
import { setupSavedObjects } from './saved_objects';
import { initializeRuleExecutorTaskDefinition } from './rule_executor';
import { CreateRuleRoute } from './routes/create_rule_route';
import { UpdateRuleRoute } from './routes/update_rule_route';
import { registerFeaturePrivileges } from './lib/security/privileges';
import { RulesClient } from './application/esql_rule/lib/rules_client';

export const config: PluginConfigDescriptor<PluginConfig> = {
  schema: configSchema,
};

export const module = new ContainerModule(({ bind }) => {
  // Register HTTP routes via DI
  bind(Route).toConstantValue(CreateRuleRoute);
  bind(Route).toConstantValue(UpdateRuleRoute);

  // Request-scoped rules client
  bind(RulesClient).toSelf().inRequestScope();

  bind(OnSetup).toConstantValue((container) => {
    const logger = container.get(Logger);
    const pluginConfig = container.get(
      PluginInitializer('config')
    ) as PluginInitializerContext['config'];
    const alertingConfig = pluginConfig.get<PluginConfig>();

    // Register feature privileges
    registerFeaturePrivileges(container.get(PluginSetup('features')));

    // Saved Objects + Encrypted Saved Objects registration
    setupSavedObjects({
      savedObjects: container.get(CoreSetup('savedObjects')),
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

export type { PluginConfig as AlertingV2Config } from './config';
