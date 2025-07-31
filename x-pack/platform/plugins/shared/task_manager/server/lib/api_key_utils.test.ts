/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  isRequestApiKeyType,
  getApiKeyFromRequest,
  createApiKey,
  getApiKeyAndUserScope,
} from './api_key_utils';
import { coreMock } from '@kbn/core/server/mocks';
import { httpServerMock } from '@kbn/core-http-server-mocks';
import type { AuthenticatedUser } from '@kbn/core/server';

const mockTask = {
  id: 'task',
  params: { hello: 'world' },
  state: { foo: 'bar' },
  taskType: 'report',
};

describe('api_key_utils', () => {
  describe('isRequestApiKeyType', () => {
    test('should return true if the request is made by a API key', () => {
      const mockUser = { authentication_type: 'api_key' } as AuthenticatedUser;
      expect(isRequestApiKeyType(mockUser)).toBeTruthy();
    });

    test('should return false if the request is made by a user', () => {
      const mockUser = { authentication_type: 'basic' } as AuthenticatedUser;
      expect(isRequestApiKeyType(mockUser)).toBeFalsy();
    });
  });

  describe('getApiKeyFromRequest', () => {
    test('should return the API key from a request', () => {
      const mockApiKey = Buffer.from('apiKeyId:apiKey').toString('base64');

      const request = httpServerMock.createKibanaRequest({
        headers: {
          authorization: `ApiKey: ${mockApiKey}`,
        },
      });

      const result = getApiKeyFromRequest(request);
      expect(result).toEqual({ id: 'apiKeyId', api_key: 'apiKey' });
    });

    test('should return null if request is missing the authorization header', () => {
      const request = httpServerMock.createKibanaRequest();
      const result = getApiKeyFromRequest(request);
      expect(result).toBeNull();
    });
  });

  describe('createApiKey', () => {
    test('should create the API key if the request was made by the client', async () => {
      const request = httpServerMock.createKibanaRequest();
      const coreStart = coreMock.createStart();
      const mockUser = {
        authentication_type: 'basic',
        username: 'testUser',
      };

      coreStart.security.authc.apiKeys.areAPIKeysEnabled = jest.fn().mockReturnValueOnce(true);
      coreStart.security.authc.getCurrentUser = jest.fn().mockReturnValueOnce(mockUser);

      coreStart.security.authc.apiKeys.grantAsInternalUser = jest.fn().mockResolvedValueOnce({
        id: 'apiKeyId',
        name: 'TaskManager: testUser',
        api_key: 'apiKey',
      });

      const result = await createApiKey([mockTask], request, coreStart.security);
      const apiKeyResult = result.get('task');
      const decodedApiKey = Buffer.from(apiKeyResult!.apiKey, 'base64').toString();
      expect(decodedApiKey).toEqual('apiKeyId:apiKey');

      expect(coreStart.security.authc.apiKeys.areAPIKeysEnabled).toHaveBeenCalled();
      expect(coreStart.security.authc.getCurrentUser).toHaveBeenCalledWith(request);
      expect(coreStart.security.authc.apiKeys.grantAsInternalUser).toHaveBeenCalledWith(request, {
        name: 'TaskManager: report - testUser',
        role_descriptors: {},
        metadata: { managed: true },
      });
    });

    test('should return the API key if the request was made by API key', async () => {
      const mockApiKey = Buffer.from('apiKeyId:apiKey').toString('base64');
      const request = httpServerMock.createKibanaRequest({
        headers: {
          authorization: `ApiKey: ${mockApiKey}`,
        },
      });

      const coreStart = coreMock.createStart();
      const mockUser = {
        authentication_type: 'api_key',
        username: 'testUser',
      };

      coreStart.security.authc.apiKeys.areAPIKeysEnabled = jest.fn().mockReturnValueOnce(true);
      coreStart.security.authc.getCurrentUser = jest.fn().mockReturnValue(mockUser);

      const result = await createApiKey([mockTask], request, coreStart.security);
      const apiKeyResult = result.get('task');
      const decodedApiKey = Buffer.from(apiKeyResult!.apiKey, 'base64').toString();
      expect(decodedApiKey).toEqual('apiKeyId:apiKey');

      expect(coreStart.security.authc.apiKeys.areAPIKeysEnabled).toHaveBeenCalled();
      expect(coreStart.security.authc.getCurrentUser).toHaveBeenCalledWith(request);
      expect(coreStart.security.authc.apiKeys.grantAsInternalUser).not.toHaveBeenCalled();
    });

    test('should throw if API keys are not enabled', async () => {
      const request = httpServerMock.createKibanaRequest();
      const coreStart = coreMock.createStart();
      coreStart.security.authc.apiKeys.areAPIKeysEnabled = jest.fn().mockReturnValueOnce(false);
      coreStart.security.authc.getCurrentUser = jest.fn().mockReturnValue(null);

      await expect(createApiKey([mockTask], request, coreStart.security)).rejects.toMatchObject({
        message: 'API keys are not enabled, cannot create API key.',
      });
    });

    test('should throw if user is not authenticated', async () => {
      const request = httpServerMock.createKibanaRequest();
      const coreStart = coreMock.createStart();
      coreStart.security.authc.apiKeys.areAPIKeysEnabled = jest.fn().mockReturnValueOnce(true);

      await expect(createApiKey([mockTask], request, coreStart.security)).rejects.toMatchObject({
        message: 'Cannot authenticate current user.',
      });
    });

    test('should throw if API key was not created', async () => {
      const request = httpServerMock.createKibanaRequest();
      const coreStart = coreMock.createStart();
      const mockUser = {
        authentication_type: 'basic',
        username: 'testUser',
      };
      coreStart.security.authc.apiKeys.areAPIKeysEnabled = jest.fn().mockReturnValueOnce(true);
      coreStart.security.authc.getCurrentUser = jest.fn().mockReturnValueOnce(mockUser);
      coreStart.security.authc.apiKeys.grantAsInternalUser = jest.fn().mockResolvedValueOnce(null);
      await expect(createApiKey([mockTask], request, coreStart.security)).rejects.toMatchObject({
        message: 'Could not create API key.',
      });
    });
  });

  describe('getUserScope', () => {
    test('should return the users scope based on their request', async () => {
      const request = httpServerMock.createKibanaRequest({ path: '/s/test-space' });
      const coreStart = coreMock.createStart();

      const mockUser = {
        authentication_type: 'basic',
        username: 'testUser',
      };

      coreStart.security.authc.apiKeys.areAPIKeysEnabled = jest.fn().mockReturnValueOnce(true);
      coreStart.security.authc.getCurrentUser = jest.fn().mockReturnValueOnce(mockUser);

      coreStart.security.authc.apiKeys.grantAsInternalUser = jest.fn().mockResolvedValueOnce({
        id: 'apiKeyId',
        name: 'TaskManager: testUser',
        api_key: 'apiKey',
      });

      const result = await getApiKeyAndUserScope([mockTask], request, coreStart.security);

      expect(result.get('task')).toEqual({
        apiKey: 'YXBpS2V5SWQ6YXBpS2V5',
        userScope: {
          apiKeyId: 'apiKeyId',
          spaceId: 'test-space',
          apiKeyCreatedByUser: false,
        },
      });
    });

    test('should default space to default if space is not found', async () => {
      const request = httpServerMock.createKibanaRequest();
      const coreStart = coreMock.createStart();

      const mockUser = {
        authentication_type: 'basic',
        username: 'testUser',
      };

      coreStart.security.authc.apiKeys.areAPIKeysEnabled = jest.fn().mockReturnValueOnce(true);
      coreStart.security.authc.getCurrentUser = jest.fn().mockReturnValueOnce(mockUser);

      coreStart.security.authc.apiKeys.grantAsInternalUser = jest.fn().mockResolvedValueOnce({
        id: 'apiKeyId',
        name: 'TaskManager: testUser',
        api_key: 'apiKey',
      });

      const result = await getApiKeyAndUserScope([mockTask], request, coreStart.security);

      expect(result.get('task')).toEqual({
        apiKey: 'YXBpS2V5SWQ6YXBpS2V5',
        userScope: {
          apiKeyId: 'apiKeyId',
          spaceId: 'default',
          apiKeyCreatedByUser: false,
        },
      });
    });

    test('should set apiKeyCreatedByUser to true if the API key existed prior', async () => {
      const mockApiKey = Buffer.from('apiKeyId:apiKey').toString('base64');
      const request = httpServerMock.createKibanaRequest({
        headers: {
          authorization: `ApiKey: ${mockApiKey}`,
        },
      });

      const coreStart = coreMock.createStart();
      const mockUser = {
        authentication_type: 'api_key',
        username: 'testUser',
      };

      coreStart.security.authc.apiKeys.areAPIKeysEnabled = jest.fn().mockReturnValueOnce(true);
      coreStart.security.authc.getCurrentUser = jest.fn().mockReturnValue(mockUser);

      const result = await getApiKeyAndUserScope([mockTask], request, coreStart.security);

      expect(result.get('task')).toEqual({
        apiKey: 'YXBpS2V5SWQ6YXBpS2V5',
        userScope: {
          apiKeyId: 'apiKeyId',
          spaceId: 'default',
          apiKeyCreatedByUser: true,
        },
      });
    });
  });
});
