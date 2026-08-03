/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock, savedObjectsClientMock } from '@kbn/core/server/mocks';
import { ApiKeyType } from '../config';
import type { ConcreteTaskInstance } from '../task';
import { TaskStatus } from '../task';
import { EsApiKeyStrategy } from './es_api_key_strategy';

const mockTaskInstance = (overrides: Partial<ConcreteTaskInstance> = {}): ConcreteTaskInstance => ({
  id: 'task-1',
  taskType: 'report',
  params: {},
  state: {},
  scheduledAt: new Date(),
  attempts: 0,
  status: TaskStatus.Running,
  runAt: new Date(),
  startedAt: new Date(),
  retryAt: null,
  ownerId: null,
  ...overrides,
});

describe('EsApiKeyStrategy', () => {
  const strategy = new EsApiKeyStrategy();

  test('shouldGrantUiam is false', () => {
    expect(strategy.shouldGrantUiam).toBe(false);
  });

  test('typeToUse is ES', () => {
    expect(strategy.typeToUse).toBe(ApiKeyType.ES);
  });

  describe('getApiKeyForFakeRequest', () => {
    test('returns apiKey from task instance', () => {
      const task = mockTaskInstance({ apiKey: 'es-encoded-key' });
      expect(strategy.getApiKeyForFakeRequest(task)).toBe('es-encoded-key');
    });

    test('returns undefined when task has no apiKey', () => {
      const task = mockTaskInstance();
      expect(strategy.getApiKeyForFakeRequest(task)).toBeUndefined();
    });
  });

  describe('getApiKeyIdsForInvalidation', () => {
    test('returns ES apiKeyId from userScope', () => {
      const task = mockTaskInstance({
        apiKey: 'es-key',
        userScope: {
          apiKeyId: 'es-key-id',
          spaceId: 'default',
          apiKeyCreatedByUser: false,
        },
      });

      expect(strategy.getApiKeyIdsForInvalidation(task)).toEqual([{ apiKeyId: 'es-key-id' }]);
    });

    test('returns empty array when userScope is missing', () => {
      const task = mockTaskInstance({ apiKey: 'es-key' });
      expect(strategy.getApiKeyIdsForInvalidation(task)).toEqual([]);
    });

    test('returns empty array when apiKeyCreatedByUser is true', () => {
      const task = mockTaskInstance({
        apiKey: 'es-key',
        userScope: {
          apiKeyId: 'es-key-id',
          spaceId: 'default',
          apiKeyCreatedByUser: true,
        },
      });

      expect(strategy.getApiKeyIdsForInvalidation(task)).toEqual([]);
    });

    test('also emits a UIAM invalidation target when task has a residual uiamApiKey (post-rollback)', () => {
      // Simulates a task scheduled under EsAndUiamApiKeyStrategy that now has
      // a lingering UIAM key after the deployment rolled back to EsApiKeyStrategy.
      const task = mockTaskInstance({
        apiKey: 'es-key',
        uiamApiKey: 'essu_uiam-key',
        userScope: {
          apiKeyId: 'es-key-id',
          uiamApiKeyId: 'uiam-key-id',
          spaceId: 'default',
          apiKeyCreatedByUser: false,
        },
      });

      expect(strategy.getApiKeyIdsForInvalidation(task)).toEqual([
        { apiKeyId: 'es-key-id' },
        { apiKeyId: 'uiam-key-id', uiamApiKey: 'essu_uiam-key' },
      ]);
    });

    test('does not emit UIAM target when userScope.uiamApiKeyId is present but uiamApiKey value is missing', () => {
      const task = mockTaskInstance({
        apiKey: 'es-key',
        userScope: {
          apiKeyId: 'es-key-id',
          uiamApiKeyId: 'uiam-key-id',
          spaceId: 'default',
          apiKeyCreatedByUser: false,
        },
      });

      expect(strategy.getApiKeyIdsForInvalidation(task)).toEqual([{ apiKeyId: 'es-key-id' }]);
    });

    test('returns empty array when apiKeyCreatedByUser is true even if a residual uiamApiKey is present', () => {
      const task = mockTaskInstance({
        apiKey: 'es-key',
        uiamApiKey: 'essu_uiam-key',
        userScope: {
          apiKeyId: 'es-key-id',
          uiamApiKeyId: 'uiam-key-id',
          spaceId: 'default',
          apiKeyCreatedByUser: true,
        },
      });

      expect(strategy.getApiKeyIdsForInvalidation(task)).toEqual([]);
    });
  });

  describe('markForInvalidation', () => {
    test('creates invalidation SOs for ES keys', async () => {
      const logger = loggingSystemMock.createLogger();
      const soClient = savedObjectsClientMock.create();

      await strategy.markForInvalidation(
        [{ apiKeyId: 'key-1' }, { apiKeyId: 'key-2' }],
        logger,
        soClient
      );

      expect(soClient.bulkCreate).toHaveBeenCalledWith([
        {
          attributes: { apiKeyId: 'key-1', createdAt: expect.any(String) },
          type: 'api_key_to_invalidate',
        },
        {
          attributes: { apiKeyId: 'key-2', createdAt: expect.any(String) },
          type: 'api_key_to_invalidate',
        },
      ]);
    });

    test('does nothing when targets array is empty', async () => {
      const logger = loggingSystemMock.createLogger();
      const soClient = savedObjectsClientMock.create();

      await strategy.markForInvalidation([], logger, soClient);

      expect(soClient.bulkCreate).not.toHaveBeenCalled();
    });

    test('logs error when bulkCreate fails', async () => {
      const logger = loggingSystemMock.createLogger();
      const soClient = savedObjectsClientMock.create();
      soClient.bulkCreate.mockRejectedValueOnce(new Error('SO error'));

      await strategy.markForInvalidation([{ apiKeyId: 'key-1' }], logger, soClient);

      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining('Failed to bulk mark 1 API keys for invalidation')
      );
    });
  });
});
