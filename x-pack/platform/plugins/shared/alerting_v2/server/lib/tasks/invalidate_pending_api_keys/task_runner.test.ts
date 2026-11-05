/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { savedObjectsClientMock } from '@kbn/core/server/mocks';
import { loggingSystemMock } from '@kbn/core/server/mocks';
import { securityServiceMock } from '@kbn/core-security-server-mocks';
import { securityMock } from '@kbn/security-plugin/server/mocks';
import type { InvalidationRunnerOptions } from '@kbn/response-ops-api-keys';
import { createLoggerService } from '../../services/logger_service/logger_service.mock';
import { ALERTING_LOG_CODES } from '../../errors/error_codes';

import type { PluginInitializerContext } from '@kbn/core/server';
import { API_KEY_PENDING_INVALIDATION_TYPE } from '../../../saved_objects';
import type { PluginConfig } from '../../../config';
import { ApiKeyInvalidationTaskRunner } from './task_runner';

jest.mock('@kbn/response-ops-api-keys', () => ({
  createInvalidationRunner: jest.fn(),
}));

const { createInvalidationRunner } = jest.requireMock('@kbn/response-ops-api-keys');

const config = {
  get: jest.fn().mockReturnValue({ invalidateApiKeysTask: { interval: '5m', removalDelay: '1h' } }),
} as unknown as PluginInitializerContext<PluginConfig>['config'];

describe('ApiKeyInvalidationTaskRunner', () => {
  const coreLogger = loggingSystemMock.createLogger();
  const { loggerService, mockLogger } = createLoggerService();
  const savedObjectsClient = savedObjectsClientMock.create();
  const securityStart = securityMock.createStart();
  const securityCore = securityServiceMock.createStart();
  const runPass = jest.fn();

  let runner: ApiKeyInvalidationTaskRunner;

  const runnerOptions = (): InvalidationRunnerOptions => createInvalidationRunner.mock.calls[0][0];

  beforeEach(() => {
    jest.clearAllMocks();
    runPass.mockResolvedValue({ runs: 1, total_invalidated: 3, missing_api_key_retries: {} });
    createInvalidationRunner.mockReturnValue({ run: runPass });

    runner = new ApiKeyInvalidationTaskRunner(
      coreLogger,
      loggerService,
      savedObjectsClient,
      securityCore,
      securityStart,
      config
    );
  });

  it('runs the invalidation with correct parameters and no encryptedSavedObjectsClient', async () => {
    const result = await runner.run({
      taskInstance: { state: { runs: 0, total_invalidated: 0 } } as never,
      signal: new AbortController().signal,
    });

    expect(runnerOptions()).toEqual(
      expect.objectContaining({ logger: coreLogger, removalDelay: '1h' })
    );
    expect(await runnerOptions().getRunDependencies()).toEqual({
      savedObjectsClient,
      savedObjectType: API_KEY_PENDING_INVALIDATION_TYPE,
      savedObjectTypesToQuery: [],
      invalidateApiKeyFn: securityStart.authc.apiKeys.invalidateAsInternalUser,
      invalidateUiamApiKeyFn: securityCore.authc.apiKeys.uiam?.invalidate,
    });

    expect(result).toEqual({
      state: { runs: 1, total_invalidated: 3, missing_api_key_retries: {} },
      schedule: { interval: '5m' },
    });
  });

  it('returns updated state on success', async () => {
    runPass.mockResolvedValue({ runs: 3, total_invalidated: 5, missing_api_key_retries: {} });
    const state = { runs: 2, total_invalidated: 10, missing_api_key_retries: {} };

    const result = await runner.run({
      taskInstance: { state } as never,
      signal: new AbortController().signal,
    });

    expect(runPass).toHaveBeenCalledWith(state);
    expect(result).toEqual({
      state: { runs: 3, total_invalidated: 5, missing_api_key_retries: {} },
      schedule: { interval: '5m' },
    });
  });

  it('logs a coded warning when a run fails', async () => {
    await runner.run({
      taskInstance: { state: {} } as never,
      signal: new AbortController().signal,
    });

    runnerOptions().onError?.(new Error('invalidation failed'));

    expect(mockLogger.warn).toHaveBeenCalledWith('API key invalidation task run failed', {
      labels: { code: ALERTING_LOG_CODES.TASKS_API_KEY_INVALIDATION_RUN_FAILED },
      error: expect.objectContaining({ message: 'invalidation failed' }),
    });
  });
});
