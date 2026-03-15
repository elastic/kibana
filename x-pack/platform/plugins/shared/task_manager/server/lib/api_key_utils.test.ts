/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

jest.mock('@kbn/core-security-server', () => ({
  isUiamCredential: jest.fn(() => false),
}));

import { isUiamCredential } from '@kbn/core-security-server';
import {
  isRequestApiKeyType,
  getApiKeyFromRequest,
  createApiKey,
  getApiKeyAndUserScope,
} from './api_key_utils';
import type { ApiKeyAndUserScopeBoth, EncodedApiKeyResultBoth } from './api_key_utils';
import { coreMock } from '@kbn/core/server/mocks';
import { httpServerMock } from '@kbn/core-http-server-mocks';
import type { AuthenticatedUser, FakeRawRequest } from '@kbn/core/server';
import type { IBasePath } from '@kbn/core/server';
import { kibanaRequestFactory } from '@kbn/core-http-server-utils';

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

      const result = await createApiKey([mockTask], request, coreStart.security, {
        shouldGrantUiam: false,
      });
      const apiKeyResult = result.get('task')!;
      expect('apiKey' in apiKeyResult && apiKeyResult.apiKey).toBeDefined();
      const decodedApiKey = Buffer.from(
        'apiKey' in apiKeyResult ? apiKeyResult.apiKey : '',
        'base64'
      ).toString();
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

      const result = await createApiKey([mockTask], request, coreStart.security, {
        shouldGrantUiam: false,
      });
      const apiKeyResult = result.get('task')!;
      expect('apiKey' in apiKeyResult && apiKeyResult.apiKey).toBeDefined();
      const decodedApiKey = Buffer.from(
        'apiKey' in apiKeyResult ? apiKeyResult.apiKey : '',
        'base64'
      ).toString();
      expect(decodedApiKey).toEqual('apiKeyId:apiKey');

      expect(coreStart.security.authc.apiKeys.areAPIKeysEnabled).toHaveBeenCalled();
      expect(coreStart.security.authc.getCurrentUser).toHaveBeenCalledWith(request);
      expect(coreStart.security.authc.apiKeys.grantAsInternalUser).not.toHaveBeenCalled();
    });

    test('should return the API key if the request is a fake request', async () => {
      const mockApiKey = Buffer.from('apiKeyId:my-fake-apiKey').toString('base64');
      const fakeRawRequest: FakeRawRequest = {
        headers: {
          authorization: `ApiKey ${mockApiKey}`,
        },
        path: '/',
      };

      const fakeRequest = kibanaRequestFactory(fakeRawRequest);

      const coreStart = coreMock.createStart();

      coreStart.security.authc.apiKeys.areAPIKeysEnabled = jest.fn().mockReturnValueOnce(true);
      coreStart.security.authc.getCurrentUser = jest.fn().mockReturnValue(null);

      const result = await createApiKey([mockTask], fakeRequest, coreStart.security, {
        shouldGrantUiam: false,
      });
      const apiKeyResult = result.get('task')!;
      expect('apiKey' in apiKeyResult && apiKeyResult.apiKey).toBeDefined();
      const decodedApiKey = Buffer.from(
        'apiKey' in apiKeyResult ? apiKeyResult.apiKey : '',
        'base64'
      ).toString();
      expect(decodedApiKey).toEqual('apiKeyId:my-fake-apiKey');

      expect(coreStart.security.authc.apiKeys.areAPIKeysEnabled).toHaveBeenCalled();
      expect(coreStart.security.authc.getCurrentUser).toHaveBeenCalledWith(fakeRequest);
      expect(coreStart.security.authc.apiKeys.grantAsInternalUser).not.toHaveBeenCalled();
    });

    test('should throw if API keys are not enabled', async () => {
      const request = httpServerMock.createKibanaRequest();
      const coreStart = coreMock.createStart();
      coreStart.security.authc.apiKeys.areAPIKeysEnabled = jest.fn().mockReturnValueOnce(false);
      coreStart.security.authc.getCurrentUser = jest.fn().mockReturnValue(null);

      await expect(
        createApiKey([mockTask], request, coreStart.security, { shouldGrantUiam: false })
      ).rejects.toMatchObject({
        message: 'API keys are not enabled, cannot create API key.',
      });
    });

    test('should throw if API key cannot be retrieved from user request', async () => {
      const mockApiKey = Buffer.from('apiKeyId:apiKey').toString('base64');
      const request = httpServerMock.createKibanaRequest({
        headers: {
          bad_authorization: `ApiKey: ${mockApiKey}`,
        },
      });

      const coreStart = coreMock.createStart();
      const mockUser = {
        authentication_type: 'api_key',
        username: 'testUser',
      };

      coreStart.security.authc.apiKeys.areAPIKeysEnabled = jest.fn().mockReturnValueOnce(true);
      coreStart.security.authc.getCurrentUser = jest.fn().mockReturnValue(mockUser);

      await expect(
        createApiKey([mockTask], request, coreStart.security, { shouldGrantUiam: false })
      ).rejects.toMatchObject({
        message: 'Could not extract API key from user request header.',
      });

      expect(coreStart.security.authc.apiKeys.areAPIKeysEnabled).toHaveBeenCalled();
      expect(coreStart.security.authc.getCurrentUser).toHaveBeenCalledWith(request);
      expect(coreStart.security.authc.apiKeys.grantAsInternalUser).not.toHaveBeenCalled();
    });

    test('should throw if API key cannot be retrieved from fake request', async () => {
      const mockApiKey = Buffer.from('apiKeyId:apiKey').toString('base64');
      const fakeRawRequest: FakeRawRequest = {
        headers: {
          bad_authorization: `ApiKey ${mockApiKey}`,
        },
        path: '/',
      };

      const fakeRequest = kibanaRequestFactory(fakeRawRequest);

      const coreStart = coreMock.createStart();
      coreStart.security.authc.apiKeys.areAPIKeysEnabled = jest.fn().mockReturnValueOnce(true);
      coreStart.security.authc.getCurrentUser = jest.fn().mockReturnValue(null);

      await expect(
        createApiKey([mockTask], fakeRequest, coreStart.security, { shouldGrantUiam: false })
      ).rejects.toMatchObject({
        message: 'Could not extract API key from fake request header.',
      });

      expect(coreStart.security.authc.apiKeys.areAPIKeysEnabled).toHaveBeenCalled();
      expect(coreStart.security.authc.getCurrentUser).toHaveBeenCalledWith(fakeRequest);
      expect(coreStart.security.authc.apiKeys.grantAsInternalUser).not.toHaveBeenCalled();
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
      await expect(
        createApiKey([mockTask], request, coreStart.security, { shouldGrantUiam: false })
      ).rejects.toMatchObject({
        message: 'Could not create API key.',
      });
    });

    test('should create both ES and UIAM API keys when shouldGrantUiam true and uiam is available', async () => {
      const request = httpServerMock.createKibanaRequest();
      const coreStart = coreMock.createStart();
      const mockUser = {
        authentication_type: 'basic',
        username: 'testUser',
      };

      coreStart.security.authc.apiKeys.areAPIKeysEnabled = jest.fn().mockReturnValueOnce(true);
      coreStart.security.authc.getCurrentUser = jest.fn().mockReturnValueOnce(mockUser);
      coreStart.security.authc.apiKeys.uiam = {
        grant: jest.fn().mockResolvedValueOnce({
          id: 'uiamKeyId',
          api_key: 'uiamKey',
        }),
        invalidate: jest.fn(),
      } as unknown as typeof coreStart.security.authc.apiKeys.uiam;

      coreStart.security.authc.apiKeys.grantAsInternalUser = jest.fn().mockResolvedValueOnce({
        id: 'apiKeyId',
        name: 'TaskManager: testUser',
        api_key: 'apiKey',
      });

      const result = await createApiKey([mockTask], request, coreStart.security, {
        shouldGrantUiam: true,
      });

      const apiKeyResult = result.get('task')! as EncodedApiKeyResultBoth;
      expect(apiKeyResult).toHaveProperty('apiKey');
      expect(apiKeyResult).toHaveProperty('apiKeyId', 'apiKeyId');
      expect(apiKeyResult).toHaveProperty('uiamApiKey');
      expect(apiKeyResult).toHaveProperty('uiamApiKeyId', 'uiamKeyId');
      expect(Buffer.from(apiKeyResult.apiKey, 'base64').toString()).toEqual('apiKeyId:apiKey');
      expect(Buffer.from(apiKeyResult.uiamApiKey, 'base64').toString()).toEqual(
        'uiamKeyId:uiamKey'
      );
      expect(coreStart.security.authc.apiKeys.uiam!.grant).toHaveBeenCalledWith(request, {
        name: expect.stringContaining('uiam - TaskManager: report'),
      });
    });

    test('should create ES API key only when shouldGrantUiam true but uiam is not available', async () => {
      const request = httpServerMock.createKibanaRequest();
      const coreStart = coreMock.createStart();
      const mockUser = {
        authentication_type: 'basic',
        username: 'testUser',
      };

      coreStart.security.authc.apiKeys.areAPIKeysEnabled = jest.fn().mockReturnValueOnce(true);
      coreStart.security.authc.getCurrentUser = jest.fn().mockReturnValueOnce(mockUser);
      const uiamOriginal = coreStart.security.authc.apiKeys.uiam;
      (coreStart.security.authc.apiKeys as { uiam?: unknown }).uiam = undefined;

      coreStart.security.authc.apiKeys.grantAsInternalUser = jest.fn().mockResolvedValueOnce({
        id: 'apiKeyId',
        name: 'TaskManager: testUser',
        api_key: 'apiKey',
      });

      const result = await createApiKey([mockTask], request, coreStart.security, {
        shouldGrantUiam: true,
      });

      const apiKeyResult = result.get('task')!;
      expect(apiKeyResult).toHaveProperty('apiKey');
      expect(apiKeyResult).toHaveProperty('apiKeyId', 'apiKeyId');
      expect(apiKeyResult).not.toHaveProperty('uiamApiKey');
      expect(apiKeyResult).not.toHaveProperty('uiamApiKeyId');

      (coreStart.security.authc.apiKeys as { uiam?: unknown }).uiam = uiamOriginal;
    });

    test('should create ES API key only when shouldGrantUiam true but uiam.grant returns null', async () => {
      const request = httpServerMock.createKibanaRequest();
      const coreStart = coreMock.createStart();
      const mockUser = {
        authentication_type: 'basic',
        username: 'testUser',
      };

      coreStart.security.authc.apiKeys.areAPIKeysEnabled = jest.fn().mockReturnValueOnce(true);
      coreStart.security.authc.getCurrentUser = jest.fn().mockReturnValueOnce(mockUser);
      coreStart.security.authc.apiKeys.uiam = {
        grant: jest.fn().mockResolvedValueOnce(null),
        invalidate: jest.fn(),
      } as unknown as typeof coreStart.security.authc.apiKeys.uiam;

      coreStart.security.authc.apiKeys.grantAsInternalUser = jest.fn().mockResolvedValueOnce({
        id: 'apiKeyId',
        name: 'TaskManager: testUser',
        api_key: 'apiKey',
      });

      const result = await createApiKey([mockTask], request, coreStart.security, {
        shouldGrantUiam: true,
      });

      const apiKeyResult = result.get('task')!;
      expect(apiKeyResult).toHaveProperty('apiKey');
      expect(apiKeyResult).toHaveProperty('apiKeyId', 'apiKeyId');
      expect(apiKeyResult).not.toHaveProperty('uiamApiKey');
      expect(apiKeyResult).not.toHaveProperty('uiamApiKeyId');
      expect(coreStart.security.authc.apiKeys.uiam!.grant).toHaveBeenCalled();
    });

    test('should return uiamApiKey only when request has API key, shouldGrantUiam true, and isUiamCredential true', async () => {
      const mockApiKey = Buffer.from('uiamKeyId:uiamKey').toString('base64');
      (isUiamCredential as jest.Mock).mockReturnValueOnce(true);

      const request = httpServerMock.createKibanaRequest({
        headers: { authorization: `ApiKey ${mockApiKey}` },
      });
      const coreStart = coreMock.createStart();
      const mockUser = {
        authentication_type: 'api_key',
        username: 'testUser',
      };

      coreStart.security.authc.apiKeys.areAPIKeysEnabled = jest.fn().mockReturnValueOnce(true);
      coreStart.security.authc.getCurrentUser = jest.fn().mockReturnValue(mockUser);

      const result = await createApiKey([mockTask], request, coreStart.security, {
        shouldGrantUiam: true,
      });

      const apiKeyResult = result.get('task')!;
      expect(apiKeyResult).not.toHaveProperty('apiKey');
      expect(apiKeyResult).toHaveProperty('uiamApiKey');
      expect(apiKeyResult).toHaveProperty('uiamApiKeyId', 'uiamKeyId');
      expect(
        Buffer.from(
          'uiamApiKey' in apiKeyResult ? apiKeyResult.uiamApiKey : '',
          'base64'
        ).toString()
      ).toEqual('uiamKeyId:uiamKey');
      expect(coreStart.security.authc.apiKeys.grantAsInternalUser).not.toHaveBeenCalled();
    });
  });

  describe('getApiKeyAndUserScope', () => {
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

      const basePathMock = {
        get: jest.fn(() => '/s/test-space'),
        serverBasePath: '/',
      } as unknown as IBasePath;

      const result = await getApiKeyAndUserScope(
        [mockTask],
        request,
        coreStart.security,
        basePathMock,
        { shouldGrantUiam: false }
      );

      expect(result.get('task')).toEqual({
        apiKey: 'YXBpS2V5SWQ6YXBpS2V5',
        userScope: {
          apiKeyId: 'apiKeyId',
          spaceId: 'test-space',
          apiKeyCreatedByUser: false,
        },
      });
    });

    test('should return the users scope with a non-default serverBasePath', async () => {
      const request = httpServerMock.createKibanaRequest({ path: '/kibana' });
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

      const basePathMock = {
        get: jest.fn(() => '/kibana/s/test-space'),
        serverBasePath: '/kibana',
      } as unknown as IBasePath;

      const result = await getApiKeyAndUserScope(
        [mockTask],
        request,
        coreStart.security,
        basePathMock,
        { shouldGrantUiam: false }
      );

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

      const basePathMock = {
        get: jest.fn(() => '/'),
        serverBasePath: '/',
      } as unknown as IBasePath;

      const result = await getApiKeyAndUserScope(
        [mockTask],
        request,
        coreStart.security,
        basePathMock,
        { shouldGrantUiam: false }
      );

      expect(result.get('task')).toEqual({
        apiKey: 'YXBpS2V5SWQ6YXBpS2V5',
        userScope: {
          apiKeyId: 'apiKeyId',
          spaceId: 'default',
          apiKeyCreatedByUser: false,
        },
      });
    });

    test('should set apiKeyCreatedByUser to true if the API key existed prior on user request', async () => {
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

      const basePathMock = {
        get: jest.fn(() => '/'),
        serverBasePath: '/',
      } as unknown as IBasePath;

      const result = await getApiKeyAndUserScope(
        [mockTask],
        request,
        coreStart.security,
        basePathMock,
        { shouldGrantUiam: false }
      );

      expect(result.get('task')).toEqual({
        apiKey: 'YXBpS2V5SWQ6YXBpS2V5',
        userScope: {
          apiKeyId: 'apiKeyId',
          spaceId: 'default',
          apiKeyCreatedByUser: true,
        },
      });
    });

    test('should set apiKeyCreatedByUser to true if the API key existed prior on fake request', async () => {
      const mockApiKey = Buffer.from('apiKeyId:my-fake-apiKey').toString('base64');
      const fakeRawRequest: FakeRawRequest = {
        headers: {
          authorization: `ApiKey ${mockApiKey}`,
        },
        path: '/',
      };
      const fakeRequest = kibanaRequestFactory(fakeRawRequest);

      const coreStart = coreMock.createStart();
      coreStart.security.authc.apiKeys.areAPIKeysEnabled = jest.fn().mockReturnValueOnce(true);
      coreStart.security.authc.getCurrentUser = jest.fn().mockReturnValue(null);

      const basePathMock = {
        get: jest.fn(() => '/'),
        serverBasePath: '/',
      } as unknown as IBasePath;

      const result = await getApiKeyAndUserScope(
        [mockTask],
        fakeRequest,
        coreStart.security,
        basePathMock,
        { shouldGrantUiam: false }
      );

      expect(result.get('task')).toEqual({
        apiKey: 'YXBpS2V5SWQ6bXktZmFrZS1hcGlLZXk=',
        userScope: {
          apiKeyId: 'apiKeyId',
          spaceId: 'default',
          apiKeyCreatedByUser: true,
        },
      });
    });

    test('should return both apiKey and uiamApiKey with uiamApiKeyId in userScope when shouldGrantUiam and uiam grant succeed', async () => {
      const request = httpServerMock.createKibanaRequest({ path: '/s/test-space' });
      const coreStart = coreMock.createStart();
      const mockUser = {
        authentication_type: 'basic',
        username: 'testUser',
      };

      coreStart.security.authc.apiKeys.areAPIKeysEnabled = jest.fn().mockReturnValueOnce(true);
      coreStart.security.authc.getCurrentUser = jest.fn().mockReturnValueOnce(mockUser);
      coreStart.security.authc.apiKeys.uiam = {
        grant: jest.fn().mockResolvedValueOnce({
          id: 'uiamKeyId',
          api_key: 'uiamKey',
        }),
        invalidate: jest.fn(),
      } as unknown as typeof coreStart.security.authc.apiKeys.uiam;

      coreStart.security.authc.apiKeys.grantAsInternalUser = jest.fn().mockResolvedValueOnce({
        id: 'apiKeyId',
        name: 'TaskManager: testUser',
        api_key: 'apiKey',
      });

      const basePathMock = {
        get: jest.fn(() => '/s/test-space'),
        serverBasePath: '/',
      } as unknown as IBasePath;

      const result = await getApiKeyAndUserScope(
        [mockTask],
        request,
        coreStart.security,
        basePathMock,
        { shouldGrantUiam: true }
      );

      const entry = result.get('task')! as ApiKeyAndUserScopeBoth;
      expect(entry).toHaveProperty('apiKey');
      expect(entry).toHaveProperty('uiamApiKey');
      expect(entry.userScope).toEqual({
        apiKeyId: 'apiKeyId',
        uiamApiKeyId: 'uiamKeyId',
        spaceId: 'test-space',
        apiKeyCreatedByUser: false,
      });
      expect(Buffer.from(entry.apiKey, 'base64').toString()).toEqual('apiKeyId:apiKey');
      expect(Buffer.from(entry.uiamApiKey, 'base64').toString()).toEqual('uiamKeyId:uiamKey');
    });

    test('should return uiamApiKey only when request has API key, shouldGrantUiam true, and isUiamCredential true', async () => {
      const mockApiKey = Buffer.from('uiamKeyId:uiamKey').toString('base64');
      (isUiamCredential as jest.Mock).mockReturnValueOnce(true);

      const request = httpServerMock.createKibanaRequest({
        headers: { authorization: `ApiKey ${mockApiKey}` },
      });
      const coreStart = coreMock.createStart();
      const mockUser = {
        authentication_type: 'api_key',
        username: 'testUser',
      };

      coreStart.security.authc.apiKeys.areAPIKeysEnabled = jest.fn().mockReturnValueOnce(true);
      coreStart.security.authc.getCurrentUser = jest.fn().mockReturnValue(mockUser);

      const basePathMock = {
        get: jest.fn(() => '/'),
        serverBasePath: '/',
      } as unknown as IBasePath;

      const result = await getApiKeyAndUserScope(
        [mockTask],
        request,
        coreStart.security,
        basePathMock,
        { shouldGrantUiam: true }
      );

      const entry = result.get('task')!;
      expect(entry).not.toHaveProperty('apiKey');
      expect(entry).toHaveProperty('uiamApiKey');
      expect(entry.userScope).toEqual({
        uiamApiKeyId: 'uiamKeyId',
        spaceId: 'default',
        apiKeyCreatedByUser: true,
      });
      expect(
        Buffer.from('uiamApiKey' in entry ? entry.uiamApiKey : '', 'base64').toString()
      ).toEqual('uiamKeyId:uiamKey');
    });
  });
});
