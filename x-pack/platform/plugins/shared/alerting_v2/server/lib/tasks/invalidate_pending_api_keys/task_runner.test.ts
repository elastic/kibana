/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock, savedObjectsServiceMock } from '@kbn/core/server/mocks';
import type { SecurityServiceStart } from '@kbn/core-security-server';
import type { EncryptedSavedObjectsPluginStart } from '@kbn/encrypted-saved-objects-plugin/server';
import type { SecurityPluginStart } from '@kbn/security-plugin/server';
import type { PluginInitializerContext } from '@kbn/core/server';
import { API_KEY_PENDING_INVALIDATION_TYPE } from '../../../saved_objects';
import type { PluginConfig } from '../../../config';
import { ApiKeyInvalidationTaskRunner } from './task_runner';

jest.mock('@kbn/task-manager-plugin/server', () => ({
  runInvalidate: jest.fn().mockResolvedValue(3),
}));

const { runInvalidate } = jest.requireMock('@kbn/task-manager-plugin/server');

const securityCore: jest.Mocked<SecurityServiceStart> = {
  authc: {
    apiKeys: {
      uiam: {
        invalidate: jest.fn(),
      },
    },
  },
} as unknown as jest.Mocked<SecurityServiceStart>;

const security: jest.Mocked<SecurityPluginStart> = {
  authc: {
    apiKeys: {
      invalidateAsInternalUser: jest.fn(),
    },
  },
} as unknown as jest.Mocked<SecurityPluginStart>;

const encryptedSavedObjects: jest.Mocked<EncryptedSavedObjectsPluginStart> = {
  getClient: jest.fn().mockReturnValue({ getDecryptedAsInternalUser: jest.fn() }),
} as unknown as jest.Mocked<EncryptedSavedObjectsPluginStart>;

const config = {
  get: jest.fn().mockReturnValue({ invalidateApiKeysTask: { interval: '5m' } }),
} as unknown as PluginInitializerContext<PluginConfig>['config'];

describe('ApiKeyInvalidationTaskRunner', () => {
  const logger = loggingSystemMock.createLogger();
  const savedObjects = savedObjectsServiceMock.createStartContract();

  let runner: ApiKeyInvalidationTaskRunner;

  beforeEach(() => {
    jest.clearAllMocks();

    runner = new ApiKeyInvalidationTaskRunner(
      logger,
      savedObjects,
      securityCore,
      encryptedSavedObjects,
      security,
      config
    );
  });

  it('calls runInvalidate with correct parameters', async () => {
    const result = await runner.run({
      taskInstance: { state: { runs: 0, total_invalidated: 0 } } as never,
      abortController: new AbortController(),
    });

    expect(savedObjects.createInternalRepository).toHaveBeenCalledWith([
      API_KEY_PENDING_INVALIDATION_TYPE,
    ]);
    expect(encryptedSavedObjects.getClient).toHaveBeenCalledWith({
      includedHiddenTypes: [API_KEY_PENDING_INVALIDATION_TYPE],
    });
    expect(runInvalidate).toHaveBeenCalledWith(
      expect.objectContaining({
        savedObjectType: API_KEY_PENDING_INVALIDATION_TYPE,
        savedObjectTypesToQuery: [],
        removalDelay: '1h',
        logger,
        invalidateApiKeyFn: security.authc.apiKeys.invalidateAsInternalUser,
        invalidateUiamApiKeyFn: securityCore.authc.apiKeys.uiam?.invalidate,
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

    expect(logger.warn).toHaveBeenCalledWith(
      'Error executing notification policy apiKey invalidation task: invalidation failed'
    );
    expect(result).toEqual({
      state: { runs: 2, total_invalidated: 0 },
      schedule: { interval: '5m' },
    });
  });
});
