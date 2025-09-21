/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup, CoreStart } from '@kbn/core/server';
import type {
  EncryptedSavedObjectsPluginSetup,
  EncryptedSavedObjectsPluginStart,
} from '@kbn/encrypted-saved-objects-plugin/server';
import type {
  TaskManagerSetupContract,
  TaskManagerStartContract,
} from '@kbn/task-manager-plugin/server';
import type { IEventLogService, IEventLogClientService } from '@kbn/event-log-plugin/server';

export interface TaskManagerDependenciesPluginSetup {
  encryptedSavedObjects: EncryptedSavedObjectsPluginSetup;
  taskManager: TaskManagerSetupContract;
  eventLog: IEventLogService;
}

export interface TaskManagerDependenciesPluginStart {
  encryptedSavedObjects: EncryptedSavedObjectsPluginStart;
  taskManager: TaskManagerStartContract;
  eventLog: IEventLogClientService;
}

export class TaskManagerDependenciesPlugin {
  public setup(core: CoreSetup, plugins: TaskManagerDependenciesPluginSetup) {
    plugins.encryptedSavedObjects.registerType({
      type: 'task',
      attributesToEncrypt: new Set(['apiKey']),
      attributesToIncludeInAAD: new Set(['id', 'taskType']),
      enforceRandomId: false,
    });

    plugins.taskManager.registerCanEncryptedSavedObjects(plugins.encryptedSavedObjects.canEncrypt);
    plugins.taskManager.registerEventLogService(plugins.eventLog);
  }

  public start(core: CoreStart, plugins: TaskManagerDependenciesPluginStart) {
    plugins.taskManager.registerEncryptedSavedObjectsClient(
      plugins.encryptedSavedObjects.getClient({
        includedHiddenTypes: ['task'],
      })
    );
  }
}
