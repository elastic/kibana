/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock, savedObjectsClientMock } from '@kbn/core/server/mocks';
import type { PluginInitializerContext } from '@kbn/core/server';
import type { SecurityServiceStart } from '@kbn/core-security-server';
import { securityServiceMock } from '@kbn/core-security-server-mocks';
import { securityMock } from '@kbn/security-plugin/server/mocks';
import type { InvalidationRunnerOptions } from '@kbn/response-ops-api-keys';
import { API_KEY_PENDING_INVALIDATION_TYPE } from '../../../saved_objects';
import type { PluginConfig } from '../../../config';
import { createLoggerService } from '../../services/logger_service/logger_service.mock';
import { ApiKeyInvalidationTaskRunner } from './task_runner';

jest.mock('@kbn/response-ops-api-keys', () => ({
  createInvalidationRunner: jest.fn(),
}));

const { createInvalidationRunner } = jest.requireMock('@kbn/response-ops-api-keys');

const config = {
  get: jest.fn().mockReturnValue({ invalidateApiKeysTask: { interval: '5m', removalDelay: '1h' } }),
} as unknown as PluginInitializerContext<PluginConfig>['config'];

describe('ApiKeyInvalidationTaskRunner characterization', () => {
  const coreLogger = loggingSystemMock.createLogger();
  const { loggerService } = createLoggerService();
  const savedObjectsClient = savedObjectsClientMock.create();
  const securityStart = securityMock.createStart();
  const runPass = jest.fn();

  const runnerOptions = (): InvalidationRunnerOptions => createInvalidationRunner.mock.calls[0][0];

  beforeEach(() => {
    jest.clearAllMocks();
    runPass.mockImplementation(async (state) => state);
    createInvalidationRunner.mockReturnValue({ run: runPass });
  });

  const run = (securityCore: SecurityServiceStart, state: Record<string, unknown>) =>
    new ApiKeyInvalidationTaskRunner(
      coreLogger,
      loggerService,
      savedObjectsClient,
      securityCore,
      securityStart,
      config
    ).run({ taskInstance: { state } as never, signal: new AbortController().signal });

  it('runs the shared invalidation runner with exactly these options and dependencies', async () => {
    const securityCore = securityServiceMock.createStart();
    const state = { runs: 0, total_invalidated: 0, missing_api_key_retries: { 'key-1': 2 } };

    await run(securityCore, state);

    expect(createInvalidationRunner).toHaveBeenCalledTimes(1);
    expect(runnerOptions()).toEqual({
      logger: coreLogger,
      pluginTag: 'alerting-v2',
      removalDelay: '1h',
      getRunDependencies: expect.any(Function),
      onError: expect.any(Function),
    });
    expect(await runnerOptions().getRunDependencies()).toEqual({
      invalidateApiKeyFn: securityStart.authc.apiKeys.invalidateAsInternalUser,
      invalidateUiamApiKeyFn: securityCore.authc.apiKeys.uiam?.invalidate,
      savedObjectsClient,
      savedObjectType: API_KEY_PENDING_INVALIDATION_TYPE,
      savedObjectTypesToQuery: [],
    });
    expect(runPass).toHaveBeenCalledWith(state);
  });

  it('passes an undefined UIAM invalidator when UIAM is absent', async () => {
    const securityCore = {
      authc: { apiKeys: { uiam: null } },
    } as unknown as SecurityServiceStart;

    await run(securityCore, { runs: 0, total_invalidated: 0 });

    expect(await runnerOptions().getRunDependencies()).toEqual(
      expect.objectContaining({ invalidateUiamApiKeyFn: undefined })
    );
  });

  it('returns the state from the runner with the configured schedule', async () => {
    runPass.mockResolvedValueOnce({
      runs: 5,
      total_invalidated: 0,
      missing_api_key_retries: { 'key-1': 1 },
    });

    const result = await run(securityServiceMock.createStart(), {
      runs: 4,
      total_invalidated: 7,
      missing_api_key_retries: { 'key-1': 1 },
    });

    expect(result).toEqual({
      state: { runs: 5, total_invalidated: 0, missing_api_key_retries: { 'key-1': 1 } },
      schedule: { interval: '5m' },
    });
  });
});
