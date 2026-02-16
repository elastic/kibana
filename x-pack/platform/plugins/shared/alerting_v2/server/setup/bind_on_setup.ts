/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ContainerModuleLoadOptions } from 'inversify';
import { Logger, OnSetup, PluginSetup } from '@kbn/core-di';
import { CoreSetup, PluginInitializer } from '@kbn/core-di-server';
import { registerFeaturePrivileges } from '../lib/security/privileges';
import { registerSavedObjects } from '../saved_objects';
import { TaskDefinition } from '../lib/services/task_run_scope_service/create_task_runner';
import type { PluginConfig } from '../config';

export function bindOnSetup({ bind }: ContainerModuleLoadOptions) {
  bind(OnSetup).toConstantValue((container) => {
    const logger = container.get(Logger);
    const config = container.get(PluginInitializer('config')).get<PluginConfig>();

    registerFeaturePrivileges(container.get(PluginSetup('features')));

    registerSavedObjects({
      savedObjects: container.get(CoreSetup('savedObjects')),
      logger,
    });

    // Register capabilities based on config
    container.get(CoreSetup('capabilities')).registerProvider(() => ({
      alertingVTwo: {
        uiEnabled: config.ui.enabled,
      },
    }));

    // Trigger task registration via onActivation callbacks
    container.getAll(TaskDefinition);
  });
}
