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

import type { PluginInitializerContext } from '@kbn/core/server';
import { API_KEY_PENDING_INVALIDATION_TYPE } from '../../../saved_objects';
import type { PluginConfig } from '../../../config';
import { ApiKeyInvalidationTaskRunner } from './task_runner';

jest.mock('@kbn/task-manager-plugin/server', () => ({
  runInvalidate: jest.fn().mockResolvedValue(3),
}));

const { runInvalidate } = jest.requireMock('@kbn/task-manager-plugin/server');

const config = {
  get: jest.fn().mockReturnValue({ invalidateApiKeysTask: { interval: '5m', removalDelay: '1h' } }),
} as unknown as PluginInitializerContext<PluginConfig>['config'];

describe('ApiKeyInvalidationTaskRunner', () => {
  const logger = loggingSystemMock.createLogger();
  const savedObjectsClient = savedObjectsClientMock.create();
  const securityStart = securityMock.createStart();
  const securityCore = securityServiceMock.createStart();

  let runner: ApiKeyInvalidationTaskRunner;

  beforeEach(() => {
    jest.clearAllMocks();

    runner = new ApiKeyInvalidationTaskRunner(
      logger,
      savedObjectsClient,
      securityCore,
      securityStart,
      config
    );
  });

  it('calls runInvalidate with correct parameters and no encryptedSavedObjectsClient', async () => {
    const result = await runner.run({
      taskInstance: { state: { runs: 0, total_invalidated: 0 } } as never,
      abortController: new AbortController(),
    });

    expect(runInvalidate).toHaveBeenCalledWith(
      expect.objectContaining({
        savedObjectsClient,
        savedObjectType: API_KEY_PENDING_INVALIDATION_TYPE,
        savedObjectTypesToQuery: [],
        removalDelay: '1h',
        logger,
        invalidateApiKeyFn: securityStart.authc.apiKeys.invalidateAsInternalUser,
        invalidateUiamApiKeyFn: securityCore.authc.apiKeys.uiam?.invalidate,
      })
    );
    expect(runInvalidate).toHaveBeenCalledWith(
      expect.not.objectContaining({
        encryptedSavedObjectsClient: expect.anything(),
      })
    );

    expect(result).toEqual({
      state: { runs: 1, total_invalidated: 3 },
      schedule: { interval: '5m' },
    });
  });

  it('returns updated state on success', async () => {
    runInvalidate.mockResolvedValue(5);

    const result = await runner.run({
      taskInstance: { state: { runs: 2, total_invalidated: 10 } } as never,
      abortController: new AbortController(),
    });

    expect(result).toEqual({
      state: { runs: 3, total_invalidated: 5 },
      schedule: { interval: '5m' },
    });
  });

  it('handles errors gracefully and returns state with schedule', async () => {
    runInvalidate.mockRejectedValue(new Error('invalidation failed'));

    const result = await runner.run({
      taskInstance: { state: { runs: 1, total_invalidated: 0 } } as never,
      abortController: new AbortController(),
    });

    expect(logger.error).toHaveBeenCalledWith(
      'Error executing notification policy apiKey invalidation task: invalidation failed',
      expect.any(Object)
    );
    expect(result).toEqual({
      state: { runs: 2, total_invalidated: 0 },
      schedule: { interval: '5m' },
    });
  });
});
