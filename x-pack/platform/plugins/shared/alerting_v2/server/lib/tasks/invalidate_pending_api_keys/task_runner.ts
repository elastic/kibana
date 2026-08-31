/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsClientContract } from '@kbn/core/server';
import { Logger as BaseLogger } from '@kbn/core-di';
import { CoreStart, PluginInitializer } from '@kbn/core-di-server';
import { PluginStart } from '@kbn/core-di';
import type { Logger, PluginInitializerContext } from '@kbn/core/server';
import type { SecurityServiceStart } from '@kbn/core-security-server';
import type { SecurityPluginStart } from '@kbn/security-plugin/server';
import type { RunContext, RunResult } from '@kbn/task-manager-plugin/server/task';
import { runInvalidate } from '@kbn/task-manager-plugin/server';
import { inject, injectable } from 'inversify';
import { ALERTING_LOG_CODES } from '../../errors/error_codes';
import {
  LoggerServiceToken,
  type LoggerServiceContract,
} from '../../services/logger_service/logger_service';
import { ApiKeyServiceSavedObjectsClientToken } from '../../services/api_key_service/tokens';
import { API_KEY_PENDING_INVALIDATION_TYPE } from '../../../saved_objects';
import type { PluginConfig } from '../../../config';
import type { AlertingServerStartDependencies } from '../../../types';
import type { LatestTaskStateSchema } from './task_state';
import {
  INVALIDATE_API_KEYS_TASK_INTERVAL,
  INVALIDATE_API_KEYS_TASK_REMOVAL_DELAY,
} from './task_definition';

type TaskRunParams = Pick<RunContext, 'taskInstance' | 'signal'>;

@injectable()
export class ApiKeyInvalidationTaskRunner {
  private readonly config: PluginConfig;
  private readonly logger: LoggerServiceContract;

  constructor(
    @inject(BaseLogger) private readonly coreLogger: Logger,
    @inject(LoggerServiceToken) loggerService: LoggerServiceContract,
    @inject(ApiKeyServiceSavedObjectsClientToken)
    private readonly savedObjectsClient: SavedObjectsClientContract,
    @inject(CoreStart('security')) private readonly securityCore: SecurityServiceStart,
    @inject(PluginStart<AlertingServerStartDependencies['security']>('security'))
    private readonly security: SecurityPluginStart,
    @inject(PluginInitializer('config'))
    pluginConfigAccessor: PluginInitializerContext<PluginConfig>['config']
  ) {
    this.config = pluginConfigAccessor.get<PluginConfig>();
    this.logger = loggerService.forSubsystem('tasks');
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
        logger: this.coreLogger,
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
    } catch (error) {
      this.logger.warn({
        message: 'API key invalidation task run failed',
        error,
        code: ALERTING_LOG_CODES.TASKS_API_KEY_INVALIDATION_RUN_FAILED,
      });

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
