/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ContainerModuleLoadOptions } from 'inversify';
import { OnSetup, PluginSetup, PluginStart } from '@kbn/core-di';
import { POD_CONTRACT_PREFIX } from '../pod_contracts';
import { createAlertStatusChangedHandlers } from '../pod_contracts/alert_status_changed';
import { AlertStatusChangedOptIns } from '../lib/alert_status_changed';
import { createEncryptedSavedObjectsHandlers } from '../pod_contracts/encrypted_saved_objects';
import {
  createWorkflowsExtensionsHandlers,
  createWorkflowsManagementHandlers,
} from '../pod_contracts/workflows';
import type { AlertingServerSetupDependencies, AlertingServerStartDependencies } from '../types';

/**
 * Kibana half of the contracts a task pod reaches back into (see `pod_contracts`). Kibana only:
 * a pod never registers these, it calls them.
 */
export function bindTaskPodContracts({ bind }: ContainerModuleLoadOptions) {
  bind(OnSetup).toConstantValue((container) => {
    const taskManager = container.get(
      PluginSetup<AlertingServerSetupDependencies['taskManager']>('taskManager')
    );
    const workflowsManagement = container.get(
      PluginSetup<AlertingServerSetupDependencies['workflowsManagement']>('workflowsManagement')
    );
    const start =
      <K extends keyof AlertingServerStartDependencies>(plugin: K) =>
      () =>
        container.get(PluginStart<AlertingServerStartDependencies[K]>(plugin));

    taskManager.registerPodContract(
      `${POD_CONTRACT_PREFIX}.alertStatusChanged`,
      createAlertStatusChangedHandlers(() => container.get(AlertStatusChangedOptIns))
    );
    taskManager.registerPodContract(
      `${POD_CONTRACT_PREFIX}.encryptedSavedObjects`,
      createEncryptedSavedObjectsHandlers(start('encryptedSavedObjects') as never)
    );
    taskManager.registerPodContract(
      `${POD_CONTRACT_PREFIX}.workflowsExtensions`,
      createWorkflowsExtensionsHandlers(start('workflowsExtensions') as never)
    );
    taskManager.registerPodContract(
      `${POD_CONTRACT_PREFIX}.workflowsManagement`,
      createWorkflowsManagementHandlers(() => workflowsManagement.management as never)
    );
  });
}
