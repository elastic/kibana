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
import { API_KEY_PENDING_INVALIDATION_TYPE } from '../../../saved_objects';
import type { PluginConfig } from '../../../config';
import { createLoggerService } from '../../services/logger_service/logger_service.mock';
import { ApiKeyInvalidationTaskRunner } from './task_runner';

jest.mock('@kbn/task-manager-plugin/server', () => ({
  runInvalidate: jest.fn().mockResolvedValue({ totalInvalidated: 0, missingApiKeyRetries: {} }),
}));

const { runInvalidate } = jest.requireMock('@kbn/task-manager-plugin/server');

const config = {
  get: jest.fn().mockReturnValue({ invalidateApiKeysTask: { interval: '5m', removalDelay: '1h' } }),
} as unknown as PluginInitializerContext<PluginConfig>['config'];

describe('ApiKeyInvalidationTaskRunner characterization', () => {
  const coreLogger = loggingSystemMock.createLogger();
  const { loggerService } = createLoggerService();
  const savedObjectsClient = savedObjectsClientMock.create();
  const securityStart = securityMock.createStart();

  beforeEach(() => {
    jest.clearAllMocks();
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

  it('passes exactly these arguments to runInvalidate, copying the retry map', async () => {
    const securityCore = securityServiceMock.createStart();
    const retries = { 'key-1': 2 };

    await run(securityCore, { runs: 0, total_invalidated: 0, missing_api_key_retries: retries });

    expect(runInvalidate).toHaveBeenCalledTimes(1);
    expect(runInvalidate).toHaveBeenCalledWith({
      invalidateApiKeyFn: securityStart.authc.apiKeys.invalidateAsInternalUser,
      invalidateUiamApiKeyFn: securityCore.authc.apiKeys.uiam?.invalidate,
      logger: coreLogger,
      missingApiKeyRetries: { 'key-1': 2 },
      removalDelay: '1h',
      savedObjectsClient,
      savedObjectType: API_KEY_PENDING_INVALIDATION_TYPE,
      savedObjectTypesToQuery: [],
    });
    expect(runInvalidate.mock.calls[0][0].missingApiKeyRetries).not.toBe(retries);
  });

  it('passes an undefined UIAM invalidator and an empty retry map when UIAM and prior retries are absent', async () => {
    const securityCore = {
      authc: { apiKeys: { uiam: null } },
    } as unknown as SecurityServiceStart;

    await run(securityCore, { runs: 0, total_invalidated: 0 });

    expect(runInvalidate).toHaveBeenCalledWith(
      expect.objectContaining({ invalidateUiamApiKeyFn: undefined, missingApiKeyRetries: {} })
    );
  });

  it('keeps the previous retry map but resets total_invalidated to 0 when runInvalidate rejects (current behavior)', async () => {
    runInvalidate.mockRejectedValueOnce(new Error('invalidation failed'));

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
