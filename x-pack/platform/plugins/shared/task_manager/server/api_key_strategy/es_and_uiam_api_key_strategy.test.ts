/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { coreMock, loggingSystemMock, savedObjectsClientMock } from '@kbn/core/server/mocks';
import { asSpaceId } from '@kbn/core-spaces-common';
import { ApiKeyType } from '../config';
import type { ConcreteTaskInstance } from '../task';
import { TaskStatus } from '../task';
import { EsAndUiamApiKeyStrategy } from './es_and_uiam_api_key_strategy';
import { taskManagerUiamTelemetry } from '../otel/uiam_telemetry';

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

describe('EsAndUiamApiKeyStrategy', () => {
  let recordUiamApiKeyFallbackSpy: jest.SpyInstance;
  let recordTaskRunSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    recordUiamApiKeyFallbackSpy = jest
      .spyOn(taskManagerUiamTelemetry, 'recordUiamApiKeyFallback')
      .mockImplementation(() => {});
    recordTaskRunSpy = jest
      .spyOn(taskManagerUiamTelemetry, 'recordTaskRun')
      .mockImplementation(() => {});
  });

  const createStrategy = (typeToUse: ApiKeyType = ApiKeyType.UIAM) => {
    const coreStart = coreMock.createStart();
    const logger = loggingSystemMock.createLogger();
    const mockUiam = {
      grant: jest.fn(),
      invalidate: jest.fn(),
      convert: jest.fn(),
    };
    coreStart.security.authc.apiKeys.uiam = mockUiam as never;

    const strategy = new EsAndUiamApiKeyStrategy(typeToUse, coreStart.security, logger);
    return { strategy, coreStart, mockUiam, logger };
  };

  test('shouldGrantUiam is true', () => {
    const { strategy } = createStrategy();
    expect(strategy.shouldGrantUiam).toBe(true);
  });

  test('typeToUse reflects the config value', () => {
    const { strategy: uiamStrategy } = createStrategy(ApiKeyType.UIAM);
    expect(uiamStrategy.typeToUse).toBe(ApiKeyType.UIAM);

    const { strategy: esStrategy } = createStrategy(ApiKeyType.ES);
    expect(esStrategy.typeToUse).toBe(ApiKeyType.ES);
  });

  describe('getApiKeyForFakeRequest', () => {
    test('returns uiamApiKey when typeToUse is UIAM and uiamApiKey exists', () => {
      const { strategy } = createStrategy(ApiKeyType.UIAM);
      const task = mockTaskInstance({ apiKey: 'es-key', uiamApiKey: 'essu_uiam-key' });

      expect(strategy.getApiKeyForFakeRequest(task)).toBe('essu_uiam-key');
      expect(recordTaskRunSpy).toHaveBeenCalledWith('uiam_api_key', 'provisioned');
    });

    test('records a "user_created_key" UIAM run when the task persisted a user-supplied UIAM API key', () => {
      const { strategy } = createStrategy(ApiKeyType.UIAM);
      const task = mockTaskInstance({
        uiamApiKey: 'essu_uiam-key',
        userScope: { apiKeyId: '', apiKeyCreatedByUser: true, spaceId: asSpaceId('default') },
      });

      expect(strategy.getApiKeyForFakeRequest(task)).toBe('essu_uiam-key');
      expect(recordTaskRunSpy).toHaveBeenCalledWith('uiam_api_key', 'user_created_key');
    });

    test('returns the raw secret when uiamApiKey is stored in the `base64(id:secret)` format written by UIAM provisioning', () => {
      const { strategy } = createStrategy(ApiKeyType.UIAM);
      const task = mockTaskInstance({
        apiKey: 'es-key',
        uiamApiKey: Buffer.from('uiam-key-id:essu_uiam-key').toString('base64'),
      });

      expect(strategy.getApiKeyForFakeRequest(task)).toBe('essu_uiam-key');
    });

    test('falls back to apiKey with a debug log and records an "unexpected" fallback metric when typeToUse is UIAM but uiamApiKey is missing and apiKeyCreatedByUser is false', () => {
      const { strategy, logger } = createStrategy(ApiKeyType.UIAM);
      const task = mockTaskInstance({
        apiKey: 'es-key',
        userScope: {
          apiKeyId: 'es-key-id',
          apiKeyCreatedByUser: false,
          spaceId: asSpaceId('default'),
        },
      });

      expect(strategy.getApiKeyForFakeRequest(task)).toBe('es-key');
      expect(logger.warn).not.toHaveBeenCalled();
      expect(logger.debug).toHaveBeenCalledWith(
        'UIAM API key is not provided to create a fake request, falling back to regular API key.',
        expect.objectContaining({ tags: expect.any(Array) })
      );
      expect(recordUiamApiKeyFallbackSpy).toHaveBeenCalledWith('unexpected');
      expect(recordTaskRunSpy).toHaveBeenCalledWith('es_api_key', 'fallback_unexpected');
    });

    test('falls back to apiKey with a debug log and records an "unexpected" fallback metric when typeToUse is UIAM but uiamApiKey is missing and userScope is absent', () => {
      const { strategy, logger } = createStrategy(ApiKeyType.UIAM);
      const task = mockTaskInstance({ apiKey: 'es-key' });

      expect(strategy.getApiKeyForFakeRequest(task)).toBe('es-key');
      expect(logger.warn).not.toHaveBeenCalled();
      expect(logger.debug).toHaveBeenCalledWith(
        'UIAM API key is not provided to create a fake request, falling back to regular API key.',
        expect.objectContaining({ tags: expect.any(Array) })
      );
      expect(recordUiamApiKeyFallbackSpy).toHaveBeenCalledWith('unexpected');
      expect(recordTaskRunSpy).toHaveBeenCalledWith('es_api_key', 'fallback_unexpected');
    });

    test('falls back to apiKey with a debug log and records a "user_created_key" fallback metric when uiamApiKey is missing but apiKeyCreatedByUser is true', () => {
      const { strategy, logger } = createStrategy(ApiKeyType.UIAM);
      const task = mockTaskInstance({
        apiKey: 'es-key',
        userScope: {
          apiKeyId: 'es-key-id',
          apiKeyCreatedByUser: true,
          spaceId: asSpaceId('default'),
        },
      });

      expect(strategy.getApiKeyForFakeRequest(task)).toBe('es-key');
      expect(logger.warn).not.toHaveBeenCalled();
      expect(logger.debug).toHaveBeenCalledWith(
        'UIAM API key is not provided to create a fake request, falling back to ES API key created by the user.',
        expect.objectContaining({ tags: expect.any(Array) })
      );
      expect(recordUiamApiKeyFallbackSpy).toHaveBeenCalledWith('user_created_key');
      expect(recordTaskRunSpy).toHaveBeenCalledWith('es_api_key', 'user_created_key');
    });

    test('returns apiKey when typeToUse is ES even if uiamApiKey exists', () => {
      const { strategy, logger } = createStrategy(ApiKeyType.ES);
      const task = mockTaskInstance({ apiKey: 'es-key', uiamApiKey: 'essu_uiam-key' });

      expect(strategy.getApiKeyForFakeRequest(task)).toBe('es-key');
      expect(logger.warn).not.toHaveBeenCalled();
      expect(logger.debug).not.toHaveBeenCalled();
      expect(recordTaskRunSpy).toHaveBeenCalledWith('es_api_key', 'config');
    });

    test('falls back to uiamApiKey with a debug log when typeToUse is ES but only uiamApiKey is persisted (cloned UIAM task)', () => {
      const { strategy, logger } = createStrategy(ApiKeyType.ES);
      // Cloned UIAM tasks persist only a UIAM key, even under an ES typeToUse strategy
      // (grant_uiam_api_keys=true while api_key_type defaults to es).
      const task = mockTaskInstance({
        uiamApiKey: 'essu_uiam-key',
        userScope: {
          apiKeyId: 'uiam-key-id',
          uiamApiKeyId: 'uiam-key-id',
          spaceId: asSpaceId('default'),
          apiKeyCreatedByUser: false,
        },
      });

      expect(strategy.getApiKeyForFakeRequest(task)).toBe('essu_uiam-key');
      expect(logger.debug).toHaveBeenCalledWith(
        'ES API key is not provided to create a fake request, falling back to UIAM API key.',
        expect.objectContaining({ tags: expect.any(Array) })
      );
      expect(logger.warn).not.toHaveBeenCalled();
      expect(recordTaskRunSpy).toHaveBeenCalledWith('uiam_api_key', 'provisioned');
    });

    test('normalizes a `base64(id:secret)` uiamApiKey on the ES-strategy fallback path', () => {
      const { strategy } = createStrategy(ApiKeyType.ES);
      const task = mockTaskInstance({
        uiamApiKey: Buffer.from('uiam-key-id:essu_uiam-key').toString('base64'),
        userScope: {
          apiKeyId: 'uiam-key-id',
          uiamApiKeyId: 'uiam-key-id',
          spaceId: asSpaceId('default'),
          apiKeyCreatedByUser: false,
        },
      });

      expect(strategy.getApiKeyForFakeRequest(task)).toBe('essu_uiam-key');
    });

    test('returns undefined and does not log when task has no keys', () => {
      const { strategy, logger } = createStrategy(ApiKeyType.UIAM);
      const task = mockTaskInstance();

      expect(strategy.getApiKeyForFakeRequest(task)).toBeUndefined();
      expect(logger.warn).not.toHaveBeenCalled();
      expect(logger.debug).not.toHaveBeenCalled();
      expect(recordUiamApiKeyFallbackSpy).not.toHaveBeenCalled();
      // Non-user-scoped tasks must not be recorded on the task_run counter.
      expect(recordTaskRunSpy).not.toHaveBeenCalled();
    });

    test('records a "none" task run when typeToUse is UIAM and a user-scoped task has no keys', () => {
      const { strategy } = createStrategy(ApiKeyType.UIAM);
      const task = mockTaskInstance({
        userScope: {
          apiKeyId: 'es-key-id',
          apiKeyCreatedByUser: false,
          spaceId: asSpaceId('default'),
        },
      });

      expect(strategy.getApiKeyForFakeRequest(task)).toBeUndefined();
      expect(recordTaskRunSpy).toHaveBeenCalledWith('none', 'not_set');
    });
  });

  describe('getApiKeyIdsForInvalidation', () => {
    test('returns both ES and UIAM targets when both exist', () => {
      const { strategy } = createStrategy();
      const task = mockTaskInstance({
        apiKey: 'es-key',
        uiamApiKey: 'essu_uiam-key',
        userScope: {
          apiKeyId: 'es-key-id',
          uiamApiKeyId: 'uiam-key-id',
          spaceId: asSpaceId('default'),
          apiKeyCreatedByUser: false,
        },
      });

      expect(strategy.getApiKeyIdsForInvalidation(task)).toEqual([
        { apiKeyId: 'es-key-id' },
        { apiKeyId: 'uiam-key-id', uiamApiKey: 'essu_uiam-key' },
      ]);
    });

    test('returns only ES target when UIAM key is missing', () => {
      const { strategy } = createStrategy();
      const task = mockTaskInstance({
        apiKey: 'es-key',
        userScope: {
          apiKeyId: 'es-key-id',
          spaceId: asSpaceId('default'),
          apiKeyCreatedByUser: false,
        },
      });

      expect(strategy.getApiKeyIdsForInvalidation(task)).toEqual([{ apiKeyId: 'es-key-id' }]);
    });

    test('returns empty array when userScope is missing', () => {
      const { strategy } = createStrategy();
      const task = mockTaskInstance({ apiKey: 'es-key' });

      expect(strategy.getApiKeyIdsForInvalidation(task)).toEqual([]);
    });

    test('returns empty array when apiKeyCreatedByUser is true', () => {
      const { strategy } = createStrategy();
      const task = mockTaskInstance({
        apiKey: 'es-key',
        uiamApiKey: 'essu_uiam-key',
        userScope: {
          apiKeyId: 'es-key-id',
          uiamApiKeyId: 'uiam-key-id',
          spaceId: asSpaceId('default'),
          apiKeyCreatedByUser: true,
        },
      });

      expect(strategy.getApiKeyIdsForInvalidation(task)).toEqual([]);
    });

    test('returns only ES target when uiamApiKeyId exists but uiamApiKey is missing', () => {
      const { strategy } = createStrategy();
      const task = mockTaskInstance({
        apiKey: 'es-key',
        userScope: {
          apiKeyId: 'es-key-id',
          uiamApiKeyId: 'uiam-key-id',
          spaceId: asSpaceId('default'),
          apiKeyCreatedByUser: false,
        },
      });

      expect(strategy.getApiKeyIdsForInvalidation(task)).toEqual([{ apiKeyId: 'es-key-id' }]);
    });

    test('returns only the UIAM target for a cloned UIAM task (no ES apiKey persisted)', () => {
      const { strategy } = createStrategy();
      const task = mockTaskInstance({
        uiamApiKey: 'essu_uiam-key',
        userScope: {
          // Cloned UIAM tasks reuse the UIAM key id for apiKeyId; it must not be emitted
          // as a bare ES invalidation target (ES-native invalidate cannot revoke a UIAM key).
          apiKeyId: 'uiam-key-id',
          uiamApiKeyId: 'uiam-key-id',
          spaceId: asSpaceId('default'),
          apiKeyCreatedByUser: false,
        },
      });

      expect(strategy.getApiKeyIdsForInvalidation(task)).toEqual([
        { apiKeyId: 'uiam-key-id', uiamApiKey: 'essu_uiam-key' },
      ]);
    });
  });

  describe('markForInvalidation', () => {
    test('creates invalidation SOs with uiamApiKey for UIAM targets', async () => {
      const { strategy } = createStrategy();
      const logger = loggingSystemMock.createLogger();
      const soClient = savedObjectsClientMock.create();

      await strategy.markForInvalidation(
        [{ apiKeyId: 'es-key-id' }, { apiKeyId: 'uiam-key-id', uiamApiKey: 'essu_uiam-key' }],
        logger,
        soClient
      );

      expect(soClient.bulkCreate).toHaveBeenCalledWith([
        {
          attributes: { apiKeyId: 'es-key-id', createdAt: expect.any(String) },
          type: 'api_key_to_invalidate',
        },
        {
          attributes: {
            apiKeyId: 'uiam-key-id',
            createdAt: expect.any(String),
            uiamApiKey: 'essu_uiam-key',
          },
          type: 'api_key_to_invalidate',
        },
      ]);
    });
  });
});
