/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsClientContract } from '@kbn/core/server';
import { Logger as PluginLogger } from '@kbn/core-di';
import { CoreStart, PluginInitializer } from '@kbn/core-di-server';
import { PluginStart } from '@kbn/core-di';
import type { Logger, PluginInitializerContext } from '@kbn/core/server';
import type { SecurityServiceStart } from '@kbn/core-security-server';
import type { SecurityPluginStart } from '@kbn/security-plugin/server';
import type { RunContext, RunResult } from '@kbn/task-manager-plugin/server/task';
import { runInvalidate } from '@kbn/task-manager-plugin/server';
import { inject, injectable } from 'inversify';
import { ApiKeyServiceSavedObjectsClientToken } from '../../services/api_key_service/tokens';
import { API_KEY_PENDING_INVALIDATION_TYPE } from '../../../saved_objects';
import type { PluginConfig } from '../../../config';
import type { AlertingServerStartDependencies } from '../../../types';
import type { LatestTaskStateSchema } from './task_state';
import {
  INVALIDATE_API_KEYS_TASK_INTERVAL,
  INVALIDATE_API_KEYS_TASK_REMOVAL_DELAY,
} from './task_definition';

type TaskRunParams = Pick<RunContext, 'taskInstance' | 'abortController'>;

@injectable()
export class ApiKeyInvalidationTaskRunner {
  private readonly config: PluginConfig;

  constructor(
    @inject(PluginLogger) private readonly logger: Logger,
    @inject(ApiKeyServiceSavedObjectsClientToken)
    private readonly savedObjectsClient: SavedObjectsClientContract,
    @inject(CoreStart('security')) private readonly securityCore: SecurityServiceStart,
    @inject(PluginStart<AlertingServerStartDependencies['security']>('security'))
    private readonly security: SecurityPluginStart,
    @inject(PluginInitializer('config'))
    pluginConfigAccessor: PluginInitializerContext<PluginConfig>['config']
  ) {
    this.config = pluginConfigAccessor.get<PluginConfig>();
  }

  public async run({ taskInstance }: TaskRunParams): Promise<RunResult> {
    const state = taskInstance.state as LatestTaskStateSchema;
    const interval =
      this.config.invalidateApiKeysTask?.interval ?? INVALIDATE_API_KEYS_TASK_INTERVAL;
    const removalDelay =
      this.config.invalidateApiKeysTask?.removalDelay ?? INVALIDATE_API_KEYS_TASK_REMOVAL_DELAY;
    let totalInvalidated = 0;
    let missingApiKeyRetries = { ...state.missing_api_key_retries };

    try {
      const result = await runInvalidate({
        invalidateApiKeyFn: this.security?.authc.apiKeys.invalidateAsInternalUser,
        invalidateUiamApiKeyFn: this.securityCore.authc.apiKeys.uiam?.invalidate,
        logger: this.logger,
        missingApiKeyRetries,
        removalDelay,
        savedObjectsClient: this.savedObjectsClient,
        savedObjectType: API_KEY_PENDING_INVALIDATION_TYPE,
        savedObjectTypesToQuery: [],
      });
      totalInvalidated = result.totalInvalidated;
      missingApiKeyRetries = result.missingApiKeyRetries;

      const updatedState: LatestTaskStateSchema = {
        runs: (state.runs || 0) + 1,
        total_invalidated: totalInvalidated,
        missing_api_key_retries: missingApiKeyRetries,
      };
      return {
        state: updatedState,
        schedule: { interval },
      };
    } catch (e) {
      this.logger.error(
        `Error executing action policy apiKey invalidation task: ${(e as Error).message}`,
        {
          error: { stack_trace: (e as Error).stack },
        }
      );

      const updatedState: LatestTaskStateSchema = {
        runs: (state.runs || 0) + 1,
        total_invalidated: totalInvalidated,
        missing_api_key_retries: missingApiKeyRetries,
      };
      return {
        state: updatedState,
        schedule: { interval },
      };
    }
  }
}
