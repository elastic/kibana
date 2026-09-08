/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { coreMock, loggingSystemMock, savedObjectsClientMock } from '@kbn/core/server/mocks';
import { httpServerMock } from '@kbn/core-http-server-mocks';
import { ApiKeyType } from '../config';
import type { ConcreteTaskInstance } from '../task';
import { TaskStatus } from '../task';
import { EsAndUiamApiKeyStrategy } from './es_and_uiam_api_key_strategy';
import { taskManagerUiamTelemetry } from '../otel/uiam_telemetry';
import { asSpaceId } from '@kbn/core-spaces-common';

import {
  createApiKey,
  hasApiKey,
  getApiKeyFromRequest,
  shouldCloneApiKeyFromRequest,
} from '../lib/api_key_utils';

// `getUiamApiKeySecret` is a pure format helper the assertions below rely on, so it keeps its real
// implementation while the credential-minting helpers are stubbed.
jest.mock('../lib/api_key_utils', () => ({
  ...jest.requireActual('../lib/api_key_utils'),
  createApiKey: jest.fn(),
  hasApiKey: jest.fn(),
  getApiKeyFromRequest: jest.fn(),
  shouldCloneApiKeyFromRequest: jest.fn(),
}));
const createApiKeyMock = createApiKey as jest.MockedFunction<typeof createApiKey>;
const hasApiKeyMock = hasApiKey as jest.MockedFunction<typeof hasApiKey>;
const getApiKeyFromRequestMock = getApiKeyFromRequest as jest.MockedFunction<
  typeof getApiKeyFromRequest
>;
const shouldCloneApiKeyFromRequestMock = shouldCloneApiKeyFromRequest as jest.MockedFunction<
  typeof shouldCloneApiKeyFromRequest
>;

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
    // `clearAllMocks` does not reset implementations, so re-establish the default
    // (non-clone) behavior; individual tests opt into cloning explicitly.
    shouldCloneApiKeyFromRequestMock.mockReturnValue(false);
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

  describe('grantApiKeys', () => {
    test('grants a single fresh UIAM key (no ES clone) when cloning a UIAM request', async () => {
      const { strategy, coreStart, mockUiam } = createStrategy();
      const request = httpServerMock.createKibanaRequest({
        headers: { authorization: 'ApiKey essu_uiam-credential' },
      });

      // Cloning a UIAM request: skip the ES clone path entirely and mint one fresh UIAM key.
      shouldCloneApiKeyFromRequestMock.mockReturnValue(true);
      hasApiKeyMock.mockReturnValue(true);
      (coreStart.security.authc.getCurrentUser as jest.Mock).mockReturnValue({
        username: 'testuser',
      });

      mockUiam.grant.mockResolvedValueOnce({
        id: 'fresh-uiam-id',
        name: 'test',
        api_key: 'essu_fresh-secret',
      });

      const tasks = [{ id: 'task-1', taskType: 'report', params: {}, state: {} }];
      const result = await strategy.grantApiKeys(tasks, request, coreStart.security, {
        cloneApiKey: true,
      });

      const fields = result.get('task-1');
      // No ES API key is created/cloned for a cloned UIAM request.
      expect(createApiKeyMock).not.toHaveBeenCalled();
      expect(mockUiam.grant).toHaveBeenCalledTimes(1);
      expect(fields?.apiKey).toBeUndefined();
      expect(fields?.uiamApiKey).toBe('essu_fresh-secret');
      expect(fields?.userScope.apiKeyId).toBe('fresh-uiam-id');
      expect(fields?.userScope.uiamApiKeyId).toBe('fresh-uiam-id');
      // The cloned key is Task-Manager-owned (not the caller's), so it is invalidatable.
      expect(fields?.userScope.apiKeyCreatedByUser).toBe(false);
      // The granted UIAM key is the one used to build the fake request for execution.
      expect(strategy.getApiKeyForFakeRequest(mockTaskInstance({ ...fields }))).toBe(
        'essu_fresh-secret'
      );
    });

    test('reports UIAM keys created before a later cloned grant fails', async () => {
      const { strategy, coreStart, mockUiam } = createStrategy();
      const request = httpServerMock.createKibanaRequest({
        headers: { authorization: 'ApiKey essu_uiam-credential' },
      });
      const onApiKeyCreated = jest.fn();

      shouldCloneApiKeyFromRequestMock.mockReturnValue(true);
      hasApiKeyMock.mockReturnValue(true);
      (coreStart.security.authc.getCurrentUser as jest.Mock).mockReturnValue({
        username: 'testuser',
      });
      mockUiam.grant
        .mockResolvedValueOnce({
          id: 'first-uiam-id',
          name: 'test',
          api_key: 'essu_first-secret',
        })
        .mockRejectedValueOnce(new Error('second grant failed'));

      await expect(
        strategy.grantApiKeys(
          [
            { id: 'task-1', taskType: 'report', params: {}, state: {} },
            { id: 'task-2', taskType: 'second-report', params: {}, state: {} },
          ],
          request,
          coreStart.security,
          { cloneApiKey: true, onApiKeyCreated }
        )
      ).rejects.toThrow('Failed to grant UIAM API key for cloned task "task-2"');

      expect(onApiKeyCreated).toHaveBeenCalledTimes(1);
      expect(onApiKeyCreated).toHaveBeenCalledWith({
        apiKeyId: 'first-uiam-id',
        uiamApiKey: 'essu_first-secret',
      });
    });

    test('persists a raw user-created UIAM API key as-is (UIAM-only, no id) without minting any keys', async () => {
      const { strategy, coreStart, mockUiam } = createStrategy();
      // User-created Cloud API keys are presented as the raw `essu_` secret, not `base64(id:key)`
      const request = httpServerMock.createKibanaRequest({
        headers: { authorization: 'ApiKey essu_user_created_key' },
      });

      hasApiKeyMock.mockReturnValue(true);
      (coreStart.security.authc.getCurrentUser as jest.Mock).mockReturnValue({
        username: 'testuser',
        authentication_type: 'api_key',
      });
      getApiKeyFromRequestMock.mockReturnValue({ api_key: 'essu_user_created_key' });

      const tasks = [{ id: 'task-1', taskType: 'report', params: {}, state: {} }];
      const result = await strategy.grantApiKeys(tasks, request, coreStart.security);

      const fields = result.get('task-1');
      // No keys are minted: the user's raw key is reused directly, UIAM-only.
      expect(createApiKeyMock).not.toHaveBeenCalled();
      expect(mockUiam.grant).not.toHaveBeenCalled();
      expect(fields?.apiKey).toBeUndefined();
      expect(fields?.uiamApiKey).toBe('essu_user_created_key');
      // User-created keys carry no key id.
      expect(fields?.userScope.apiKeyId).toBe('');
      expect(fields?.userScope.uiamApiKeyId).toBeUndefined();
      expect(fields?.userScope.apiKeyCreatedByUser).toBe(true);
      // The user's key is the one used to build the fake request for execution...
      expect(strategy.getApiKeyForFakeRequest(mockTaskInstance({ ...fields }))).toBe(
        'essu_user_created_key'
      );
      // ...and it is never invalidated by task manager.
      expect(strategy.getApiKeyIdsForInvalidation(mockTaskInstance({ ...fields }))).toEqual([]);
    });

    test('persists uiamApiKeyExternal when UIAM reports the key as external', async () => {
      const { strategy, coreStart, mockUiam } = createStrategy();
      const request = httpServerMock.createKibanaRequest({
        headers: { authorization: 'ApiKey essu_user_created_key' },
      });

      hasApiKeyMock.mockReturnValue(true);
      (coreStart.security.authc.getCurrentUser as jest.Mock).mockReturnValue({
        username: 'testuser',
        authentication_type: 'api_key',
        // UIAM reported the authenticated API key as external
        api_key: { id: '72kse5wBzbyj5dh9Iz13', name: 'org key', internal: false },
      });
      getApiKeyFromRequestMock.mockReturnValue({ api_key: 'essu_user_created_key' });

      const tasks = [{ id: 'task-1', taskType: 'report', params: {}, state: {} }];
      const result = await strategy.grantApiKeys(tasks, request, coreStart.security);

      const fields = result.get('task-1');
      expect(mockUiam.grant).not.toHaveBeenCalled();
      expect(fields?.uiamApiKey).toBe('essu_user_created_key');
      expect(fields?.userScope.uiamApiKeyExternal).toBe(true);
      expect(fields?.userScope.apiKeyCreatedByUser).toBe(true);
    });

    test('grants both ES and UIAM keys when request has UIAM credential', async () => {
      const { strategy, coreStart, mockUiam } = createStrategy();
      const request = httpServerMock.createKibanaRequest({
        headers: { authorization: 'ApiKey essu_uiam-credential' },
      });

      const esKeyMap = new Map();
      esKeyMap.set('task-1', {
        apiKey: Buffer.from('esId:esSecret').toString('base64'),
        apiKeyId: 'esId',
      });
      createApiKeyMock.mockResolvedValueOnce(esKeyMap);
      hasApiKeyMock.mockReturnValue(false);
      (coreStart.security.authc.getCurrentUser as jest.Mock).mockReturnValue({
        username: 'testuser',
        profile_uid: 'u_profile_123',
      });

      mockUiam.grant.mockResolvedValueOnce({
        id: 'uiamId',
        name: 'test',
        api_key: 'essu_uiam-secret',
      });

      const tasks = [{ id: 'task-1', taskType: 'report', params: {}, state: {} }];
      const result = await strategy.grantApiKeys(tasks, request, coreStart.security);

      const fields = result.get('task-1');
      expect(fields?.apiKey).toBe(Buffer.from('esId:esSecret').toString('base64'));
      expect(fields?.uiamApiKey).toBe('essu_uiam-secret');
      expect(fields?.userScope.apiKeyId).toBe('esId');
      expect(fields?.userScope.uiamApiKeyId).toBe('uiamId');
      expect(fields?.userScope.userProfileId).toBe('u_profile_123');
    });

    test('persists userProfileId resolved from the request on userScope', async () => {
      const { strategy, coreStart } = createStrategy();
      const request = httpServerMock.createKibanaRequest();

      const esKeyMap = new Map();
      esKeyMap.set('task-1', {
        apiKey: Buffer.from('esId:esSecret').toString('base64'),
        apiKeyId: 'esId',
      });
      createApiKeyMock.mockResolvedValueOnce(esKeyMap);
      hasApiKeyMock.mockReturnValue(true);
      getApiKeyFromRequestMock.mockReturnValue({
        id: 'uiam-req-id',
        api_key: 'essu_from-request',
      });
      (coreStart.security.authc.getCurrentUser as jest.Mock).mockReturnValue({
        username: 'testuser',
        profile_uid: 'u_profile_456',
      });

      const tasks = [{ id: 'task-1', taskType: 'report', params: {}, state: {} }];
      const result = await strategy.grantApiKeys(tasks, request, coreStart.security);

      expect(result.get('task-1')?.userScope.userProfileId).toBe('u_profile_456');
      expect(result.get('task-1')?.userScope.userName).toBe('testuser');
    });

    test('leaves userProfileId undefined when the resolved user has no profile_uid', async () => {
      const { strategy, coreStart } = createStrategy();
      const request = httpServerMock.createKibanaRequest();

      const esKeyMap = new Map();
      esKeyMap.set('task-1', {
        apiKey: Buffer.from('esId:esSecret').toString('base64'),
        apiKeyId: 'esId',
      });
      createApiKeyMock.mockResolvedValueOnce(esKeyMap);
      hasApiKeyMock.mockReturnValue(false);
      (coreStart.security.authc.getCurrentUser as jest.Mock).mockReturnValue({
        username: 'testuser',
      });

      const tasks = [{ id: 'task-1', taskType: 'report', params: {}, state: {} }];
      const result = await strategy.grantApiKeys(tasks, request, coreStart.security);

      expect(result.get('task-1')?.userScope.userProfileId).toBeUndefined();
    });

    test('skips UIAM grant when opts.onEsKey is true', async () => {
      const { strategy, coreStart, mockUiam } = createStrategy();
      const request = httpServerMock.createKibanaRequest({
        headers: { authorization: 'ApiKey essu_uiam-credential' },
      });

      const esKeyMap = new Map();
      esKeyMap.set('task-1', {
        apiKey: Buffer.from('esId:esSecret').toString('base64'),
        apiKeyId: 'esId',
      });
      createApiKeyMock.mockResolvedValueOnce(esKeyMap);
      hasApiKeyMock.mockReturnValue(false);
      (coreStart.security.authc.getCurrentUser as jest.Mock).mockReturnValue({
        username: 'testuser',
      });

      const tasks = [{ id: 'task-1', taskType: 'report', params: {}, state: {} }];
      const result = await strategy.grantApiKeys(tasks, request, coreStart.security, {
        onEsKey: true,
      });

      const fields = result.get('task-1');
      expect(fields?.apiKey).toBe(Buffer.from('esId:esSecret').toString('base64'));
      expect(fields?.uiamApiKey).toBeUndefined();
      expect(fields?.userScope.uiamApiKeyId).toBeUndefined();
      expect(mockUiam.grant).not.toHaveBeenCalled();
    });

    test('grants only ES keys when request credential is not UIAM-compatible', async () => {
      const { strategy, coreStart, mockUiam, logger } = createStrategy();
      const request = httpServerMock.createKibanaRequest({
        headers: { authorization: 'Basic dXNlcjpwYXNz' },
      });

      const esKeyMap = new Map();
      esKeyMap.set('task-1', {
        apiKey: Buffer.from('esId:esSecret').toString('base64'),
        apiKeyId: 'esId',
      });
      createApiKeyMock.mockResolvedValueOnce(esKeyMap);
      hasApiKeyMock.mockReturnValue(false);

      const tasks = [{ id: 'task-1', taskType: 'report', params: {}, state: {} }];
      const result = await strategy.grantApiKeys(tasks, request, coreStart.security);

      const fields = result.get('task-1');
      expect(fields?.apiKey).toBe(Buffer.from('esId:esSecret').toString('base64'));
      expect(fields?.uiamApiKey).toBeUndefined();
      expect(fields?.userScope.uiamApiKeyId).toBeUndefined();
      expect(mockUiam.grant).not.toHaveBeenCalled();
      expect(logger.debug).toHaveBeenCalledWith(
        'Request credential is not UIAM-compatible, skipping UIAM API key grant. Only ES API keys will be used.',
        { tags: ['serverless', 'task-manager', 'uiam', 'uiam-api-key-invalid-credentials'] }
      );
    });

    test('extracts UIAM key from request when user provides UIAM credential', async () => {
      const { strategy, coreStart } = createStrategy();
      const request = httpServerMock.createKibanaRequest();

      const esKeyMap = new Map();
      esKeyMap.set('task-1', {
        apiKey: Buffer.from('esId:esSecret').toString('base64'),
        apiKeyId: 'esId',
      });
      createApiKeyMock.mockResolvedValueOnce(esKeyMap);
      hasApiKeyMock.mockReturnValue(true);
      getApiKeyFromRequestMock.mockReturnValue({
        id: 'uiam-req-id',
        api_key: 'essu_from-request',
      });

      const tasks = [{ id: 'task-1', taskType: 'report', params: {}, state: {} }];
      const result = await strategy.grantApiKeys(tasks, request, coreStart.security);

      const fields = result.get('task-1');
      expect(fields?.uiamApiKey).toBe('essu_from-request');
      expect(fields?.userScope.uiamApiKeyId).toBe('uiam-req-id');
    });

    test('does not set uiamApiKey when request has non-UIAM api key', async () => {
      const { strategy, coreStart } = createStrategy();
      const request = httpServerMock.createKibanaRequest();

      const esKeyMap = new Map();
      esKeyMap.set('task-1', {
        apiKey: Buffer.from('esId:esSecret').toString('base64'),
        apiKeyId: 'esId',
      });
      createApiKeyMock.mockResolvedValueOnce(esKeyMap);
      hasApiKeyMock.mockReturnValue(true);
      getApiKeyFromRequestMock.mockReturnValue({
        id: 'es-req-id',
        api_key: 'regular-es-secret',
      });

      const tasks = [{ id: 'task-1', taskType: 'report', params: {}, state: {} }];
      const result = await strategy.grantApiKeys(tasks, request, coreStart.security);

      const fields = result.get('task-1');
      expect(fields?.uiamApiKey).toBeUndefined();
      expect(fields?.userScope.uiamApiKeyId).toBeUndefined();
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
