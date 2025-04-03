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

export interface TaskManagerDependenciesPluginSetup {
  encryptedSavedObjects: EncryptedSavedObjectsPluginSetup;
  taskManager: TaskManagerSetupContract;
}

export interface TaskManagerDependenciesPluginStart {
  encryptedSavedObjects: EncryptedSavedObjectsPluginStart;
  taskManager: TaskManagerStartContract;
}

export class TaskManagerDependenciesPlugin {
  public setup(core: CoreSetup, plugin: TaskManagerDependenciesPluginSetup) {
    plugin.encryptedSavedObjects.registerType({
      type: 'task',
      attributesToEncrypt: new Set(['apiKey']),
      attributesToIncludeInAAD: new Set(['id', 'taskType']),
      enforceRandomId: false,
    });

    plugin.taskManager.registerCanEncryptedSavedObjects(plugin.encryptedSavedObjects.canEncrypt);
  }

  public start(core: CoreStart, plugin: TaskManagerDependenciesPluginStart) {
    plugin.taskManager.registerEncryptedSavedObjectsClient(
      plugin.encryptedSavedObjects.getClient({
        includedHiddenTypes: ['task'],
      })
    );
  }
}
