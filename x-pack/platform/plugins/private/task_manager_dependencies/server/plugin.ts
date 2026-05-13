/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup, CoreStart } from '@kbn/core/server';
import type { SecurityPluginStart } from '@kbn/security-plugin/server';
import type {
  EncryptedSavedObjectsPluginSetup,
  EncryptedSavedObjectsPluginStart,
} from '@kbn/encrypted-saved-objects-plugin/server';
import type {
  TaskManagerSetupContract,
  TaskManagerStartContract,
} from '@kbn/task-manager-plugin/server';
import { EVENT_LOG_ACTIONS, EVENT_LOG_PROVIDER } from '@kbn/task-manager-plugin/server';
import type { IEventLogService } from '@kbn/event-log-plugin/server';

export interface TaskManagerDependenciesPluginSetup {
  encryptedSavedObjects: EncryptedSavedObjectsPluginSetup;
  taskManager: TaskManagerSetupContract;
  eventLog: IEventLogService;
}

export interface TaskManagerDependenciesPluginStart {
  encryptedSavedObjects: EncryptedSavedObjectsPluginStart;
  security?: SecurityPluginStart;
  taskManager: TaskManagerStartContract;
}

export class TaskManagerDependenciesPlugin {
  public setup(_: CoreSetup, plugin: TaskManagerDependenciesPluginSetup) {
    plugin.encryptedSavedObjects.registerType({
      type: 'task',
      attributesToEncrypt: new Set(['apiKey', 'uiamApiKey']),
      attributesToIncludeInAAD: new Set(['id', 'taskType']),
      enforceRandomId: false,
    });

    plugin.encryptedSavedObjects.registerType({
      type: 'api_key_to_invalidate',
      attributesToEncrypt: new Set(['uiamApiKey']),
      attributesToIncludeInAAD: new Set(['apiKeyId', 'createdAt']),
    });

    plugin.taskManager.registerCanEncryptedSavedObjects(plugin.encryptedSavedObjects.canEncrypt);

    plugin.eventLog.registerProviderActions(EVENT_LOG_PROVIDER, Object.values(EVENT_LOG_ACTIONS));
    plugin.taskManager.registerTaskEventLogger(
      plugin.eventLog.getLogger({ event: { provider: EVENT_LOG_PROVIDER } })
    );
  }

  public start(core: CoreStart, plugin: TaskManagerDependenciesPluginStart) {
    plugin.taskManager.registerEncryptedSavedObjectsClient(
      plugin.encryptedSavedObjects.getClient({
        includedHiddenTypes: ['task', 'api_key_to_invalidate'],
      })
    );
    plugin.taskManager.registerApiKeyInvalidateFn(
      plugin.security?.authc.apiKeys.invalidateAsInternalUser
    );
    plugin.taskManager.registerUiamApiKeyInvalidateFn(core.security.authc.apiKeys.uiam?.invalidate);
  }
}
