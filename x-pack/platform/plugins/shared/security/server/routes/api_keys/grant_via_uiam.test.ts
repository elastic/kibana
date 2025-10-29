/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';

import type { RequestHandler } from '@kbn/core/server';
import { kibanaResponseFactory } from '@kbn/core/server';
import { coreMock, httpServerMock } from '@kbn/core/server/mocks';
import type { DeeplyMockedKeys } from '@kbn/utility-types-jest';

import { defineGrantViaUiamApiKeyRoutes } from './grant_via_uiam';
import type { InternalAuthenticationServiceStart } from '../../authentication';
import { authenticationServiceMock } from '../../authentication/authentication_service.mock';
import { routeDefinitionParamsMock } from '../index.mock';

describe('Grant via UIAM API Key route', () => {
  function getMockContext(
    licenseCheckResult: { state: string; message?: string } = { state: 'valid' }
  ) {
    return coreMock.createCustomRequestHandlerContext({
      licensing: { license: { check: jest.fn().mockReturnValue(licenseCheckResult) } },
    });
  }

  let routeHandler: RequestHandler<any, any, any, any>;
  let authc: DeeplyMockedKeys<InternalAuthenticationServiceStart>;
  beforeEach(() => {
    authc = authenticationServiceMock.createStart();
    const mockRouteDefinitionParams = routeDefinitionParamsMock.create();
    mockRouteDefinitionParams.getAuthenticationService.mockReturnValue(authc);

    defineGrantViaUiamApiKeyRoutes(mockRouteDefinitionParams);

    const [, apiKeyRouteHandler] = mockRouteDefinitionParams.router.post.mock.calls.find(
      ([{ path }]) => path === '/internal/security/api_key/grant_via_uiam'
    )!;
    routeHandler = apiKeyRouteHandler;
  });

  describe('failure', () => {
    test('returns result of license checker', async () => {
      const mockContext = getMockContext({ state: 'invalid', message: 'test forbidden message' });
      const response = await routeHandler(
        mockContext,
        httpServerMock.createKibanaRequest(),
        kibanaResponseFactory
      );

      expect(response.status).toBe(403);
      expect(response.payload).toEqual({ message: 'test forbidden message' });
      expect((await mockContext.licensing).license.check).toHaveBeenCalledWith('security', 'basic');
    });

    test('returns error when UIAM service is not available', async () => {
      const error = new Error('UIAM service is not available');
      authc.apiKeys.grantViaUiam.mockRejectedValue(error);

      const response = await routeHandler(
        getMockContext(),
        httpServerMock.createKibanaRequest({
          headers: { authorization: 'Bearer test-token' },
          body: { name: 'my api key' },
        }),
        kibanaResponseFactory
      );

      expect(response.status).toBe(500);
    });

    test('returns error when authorization header is missing', async () => {
      const error = new Error(
        'Unable to grant an API Key via UIAM, request does not contain an authorization header'
      );
      authc.apiKeys.grantViaUiam.mockRejectedValue(error);

      const response = await routeHandler(
        getMockContext(),
        httpServerMock.createKibanaRequest({ body: { name: 'my api key' } }),
        kibanaResponseFactory
      );

      expect(response.status).toBe(500);
    });

    test('returns error from UIAM service', async () => {
      const error = Boom.unauthorized('Invalid token');
      authc.apiKeys.grantViaUiam.mockRejectedValue(error);

      const response = await routeHandler(
        getMockContext(),
        httpServerMock.createKibanaRequest({
          headers: { authorization: 'Bearer test-token' },
          body: { name: 'my api key' },
        }),
        kibanaResponseFactory
      );

      expect(response.status).toBe(401);
      expect(response.payload).toEqual(error);
    });
  });

  describe('success', () => {
    test('allows an API Key to be granted via UIAM', async () => {
      authc.apiKeys.grantViaUiam.mockResolvedValue({
        api_key: 'abc123',
        id: 'key_id',
        name: 'my api key',
        expiration: 1234567890,
      });

      const payload = {
        name: 'my api key',
        expiration: '7d',
        metadata: {
          foo: 'bar',
        },
      };

      const request = httpServerMock.createKibanaRequest({
        headers: { authorization: 'Bearer test-token' },
        body: payload,
      });

      const response = await routeHandler(getMockContext(), request, kibanaResponseFactory);
      expect(authc.apiKeys.grantViaUiam).toHaveBeenCalledWith(request, payload);
      expect(response.status).toBe(200);
      expect(response.payload).toEqual({
        api_key: 'abc123',
        id: 'key_id',
        name: 'my api key',
        expiration: 1234567890,
      });
    });

    test('allows an API Key to be granted via UIAM with minimal parameters', async () => {
      authc.apiKeys.grantViaUiam.mockResolvedValue({
        api_key: 'abc123',
        id: 'key_id',
        name: 'my api key',
      });

      const payload = {
        name: 'my api key',
      };

      const request = httpServerMock.createKibanaRequest({
        headers: { authorization: 'Bearer test-token' },
        body: payload,
      });

      const response = await routeHandler(getMockContext(), request, kibanaResponseFactory);
      expect(authc.apiKeys.grantViaUiam).toHaveBeenCalledWith(request, payload);
      expect(response.status).toBe(200);
      expect(response.payload).toEqual({
        api_key: 'abc123',
        id: 'key_id',
        name: 'my api key',
      });
    });

    test('returns bad request when API Keys are not available', async () => {
      authc.apiKeys.grantViaUiam.mockResolvedValue(null);

      const request = httpServerMock.createKibanaRequest({
        headers: { authorization: 'Bearer test-token' },
        body: { name: 'my api key' },
      });

      const response = await routeHandler(getMockContext(), request, kibanaResponseFactory);
      expect(response.status).toBe(400);
      expect(response.payload).toEqual({ message: 'API Keys are not available' });
    });
  });
});
