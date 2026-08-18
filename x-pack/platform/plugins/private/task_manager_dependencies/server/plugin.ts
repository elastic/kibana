/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Service } from '@kbn/cordis';
import type { Context } from '@kbn/cordis';
import { EVENT_LOG_ACTIONS, EVENT_LOG_PROVIDER } from '@kbn/task-manager-plugin/server';

// Migrated to native Cordis authoring — Stage 5 of the Cordis migration.
export default class TaskManagerDependenciesPlugin extends Service {
  static readonly inject = ['taskManager.setup', 'encryptedSavedObjects.setup', 'eventLog.setup'];
  static readonly provide = 'taskManagerDependencies';

  constructor(ctx: Context) {
    super(ctx, 'taskManagerDependencies');
    const plugin = {
      taskManager: (ctx.get('taskManager.setup') as any).contract,
      encryptedSavedObjects: (ctx.get('encryptedSavedObjects.setup') as any).contract,
      eventLog: (ctx.get('eventLog.setup') as any).contract,
    };
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
    // TODO: start() had a non-empty body — migrate manually:
    // {
    //     plugin.taskManager.registerEncryptedSavedObjectsClient(
    //       plugin.encryptedSavedObjects.getClient({
    //         includedHiddenTypes: ['task', 'api_key_to_invalidate'],
    //       })
    //     );
    //     plugin.taskManager.registerApiKeyInvalidateFn(
    //       plugin.security?.authc.apiKeys.invalidateAsInternalUser
    //     );
    //     plugin.taskManager.registerUiamApiKeyInvalidateFn(core.security.authc.apiKeys.uiam?.invalidate);
    //   }
  }
}
