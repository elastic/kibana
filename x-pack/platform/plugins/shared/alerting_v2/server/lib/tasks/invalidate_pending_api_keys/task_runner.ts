/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Logger as PluginLogger } from '@kbn/core-di';
import { CoreStart, PluginInitializer } from '@kbn/core-di-server';
import { PluginStart } from '@kbn/core-di';
import type { Logger, PluginInitializerContext, SavedObjectsServiceStart } from '@kbn/core/server';
import type { SecurityServiceStart } from '@kbn/core-security-server';
import type { EncryptedSavedObjectsPluginStart } from '@kbn/encrypted-saved-objects-plugin/server';
import type { SecurityPluginStart } from '@kbn/security-plugin/server';
import type { RunContext, RunResult } from '@kbn/task-manager-plugin/server/task';
import { runInvalidate } from '@kbn/task-manager-plugin/server';
import { inject, injectable } from 'inversify';
import { API_KEY_PENDING_INVALIDATION_TYPE } from '../../../saved_objects';
import type { PluginConfig } from '../../../config';
import type { AlertingServerStartDependencies } from '../../../types';
import type { LatestTaskStateSchema } from './task_state';
import { INVALIDATE_API_KEYS_TASK_REMOVAL_DELAY } from './task_definition';

type TaskRunParams = Pick<RunContext, 'taskInstance' | 'abortController'>;

@injectable()
export class ApiKeyInvalidationTaskRunner {
  private readonly logger: Logger;
  private readonly savedObjects: SavedObjectsServiceStart;
  private readonly securityCore: SecurityServiceStart;
  private readonly encryptedSavedObjects: EncryptedSavedObjectsPluginStart;
  private readonly security: SecurityPluginStart;
  private readonly config: PluginConfig;

  constructor(
    @inject(PluginLogger) logger: Logger,
    @inject(CoreStart('savedObjects')) savedObjects: SavedObjectsServiceStart,
    @inject(CoreStart('security')) securityCore: SecurityServiceStart,
    @inject(
      PluginStart<AlertingServerStartDependencies['encryptedSavedObjects']>('encryptedSavedObjects')
    )
    encryptedSavedObjects: EncryptedSavedObjectsPluginStart,
    @inject(PluginStart<AlertingServerStartDependencies['security']>('security'))
    security: SecurityPluginStart,
    @inject(PluginInitializer('config'))
    pluginConfigAccessor: PluginInitializerContext<PluginConfig>['config']
  ) {
    this.logger = logger;
    this.savedObjects = savedObjects;
    this.securityCore = securityCore;
    this.encryptedSavedObjects = encryptedSavedObjects;
    this.security = security;
    this.config = pluginConfigAccessor.get<PluginConfig>();
  }

  public async run({ taskInstance }: TaskRunParams): Promise<RunResult> {
    const state = taskInstance.state as LatestTaskStateSchema;
    const interval = this.config.invalidateApiKeysTask?.interval;
    let totalInvalidated = 0;

    try {
      const savedObjectsClient = this.savedObjects.createInternalRepository([
        API_KEY_PENDING_INVALIDATION_TYPE,
      ]);

      const encryptedSavedObjectsClient = this.encryptedSavedObjects.getClient({
        includedHiddenTypes: [API_KEY_PENDING_INVALIDATION_TYPE],
      });

      totalInvalidated = await runInvalidate({
        encryptedSavedObjectsClient,
        invalidateApiKeyFn: this.security?.authc.apiKeys.invalidateAsInternalUser,
        invalidateUiamApiKeyFn: this.securityCore.authc.apiKeys.uiam?.invalidate,
        logger: this.logger,
        removalDelay: INVALIDATE_API_KEYS_TASK_REMOVAL_DELAY,
        savedObjectsClient,
        savedObjectType: API_KEY_PENDING_INVALIDATION_TYPE,
        savedObjectTypesToQuery: [],
      });

      return {
        state: {
          runs: (state.runs || 0) + 1,
          total_invalidated: totalInvalidated,
        },
        schedule: { interval },
      };
    } catch (e) {
      this.logger.warn(
        `Error executing notification policy apiKey invalidation task: ${(e as Error).message}`
      );

      return {
        state: {
          runs: (state.runs || 0) + 1,
          total_invalidated: totalInvalidated,
        },
        schedule: { interval },
      };
    }
  }
}
