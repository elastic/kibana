/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Logger, OnSetup, PluginSetup, PluginStart } from '@kbn/core-di';
import { CoreSetup } from '@kbn/core-di-server';
import type { ContainerModuleLoadOptions } from 'inversify';
import type { AlertingServerSetupDependencies, AlertingServerStartDependencies } from '../types';
import { registerTelemetryTask } from '../lib/usage/task_definition';
import { registerAlertingV2UsageCollector } from '../lib/usage/usage_collector';
import { registerFeaturePrivileges } from '../lib/security/privileges';
import { TaskDefinition } from '../lib/services/task_run_scope_service/create_task_runner';
import { registerSavedObjects } from '../saved_objects';
import { alertingV2UiSettings } from '../ui_settings/advanced_settings';
import { EsServiceInternalToken } from '../lib/services/es_service/tokens';

export function bindOnSetup({ bind }: ContainerModuleLoadOptions) {
  bind(OnSetup).toConstantValue((container) => {
    const logger = container.get(Logger);
    const taskManager = container.get(
      PluginSetup<AlertingServerSetupDependencies['taskManager']>('taskManager')
    );
    const usageCollectionToken =
      PluginSetup<NonNullable<AlertingServerSetupDependencies['usageCollection']>>(
        'usageCollection'
      );

    registerFeaturePrivileges(container.get(PluginSetup('features')));

    registerSavedObjects({
      savedObjects: container.get(CoreSetup('savedObjects')),
      encryptedSavedObjects: container.get(
        PluginSetup<AlertingServerSetupDependencies['encryptedSavedObjects']>(
          'encryptedSavedObjects'
        )
      ),
      logger,
    });

    container.get(CoreSetup('capabilities')).registerProvider(() => ({
      alertingVTwo: {},
    }));

    const uiSettingsSetup = container.get(CoreSetup('uiSettings'));
    uiSettingsSetup.registerGlobal(alertingV2UiSettings);

    // Trigger task registration via onActivation callbacks
    container.getAll(TaskDefinition);

    if (container.isBound(usageCollectionToken)) {
      // Both getters are called task run (after start), so the
      // start-only bindings (esClient and taskManagerStart) exist by then.
      const getTaskManagerStart = () =>
        container.get(PluginStart<AlertingServerStartDependencies['taskManager']>('taskManager'));
      const usageCollection = container.get(usageCollectionToken);
      const getEsClient = () => container.get(EsServiceInternalToken);

      registerAlertingV2UsageCollector(getTaskManagerStart, usageCollection);
      registerTelemetryTask(logger, taskManager, getEsClient);
    }
  });
}
