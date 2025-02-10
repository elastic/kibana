/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { kibanaResponseFactory } from '@kbn/core/server';
import type { RequestHandler } from '@kbn/core/server';
import type { CustomRequestHandlerMock, ScopedClusterClientMock } from '@kbn/core/server/mocks';
import { coreMock, httpServerMock } from '@kbn/core/server/mocks';
import { licensingMock } from '@kbn/licensing-plugin/server/mocks';
import type { DeeplyMockedKeys } from '@kbn/utility-types-jest';

import { defineHasApiKeysRoutes } from './has_active';
import type { InternalAuthenticationServiceStart } from '../../authentication';
import { authenticationServiceMock } from '../../authentication/authentication_service.mock';
import { routeDefinitionParamsMock } from '../index.mock';

describe('Has API Keys route', () => {
  let routeHandler: RequestHandler<any, any, any, any>;
  let authc: DeeplyMockedKeys<InternalAuthenticationServiceStart>;
  let esClientMock: ScopedClusterClientMock;
  let mockContext: CustomRequestHandlerMock<unknown>;

  beforeEach(async () => {
    const mockRouteDefinitionParams = routeDefinitionParamsMock.create();
    authc = authenticationServiceMock.createStart();
    mockRouteDefinitionParams.getAuthenticationService.mockReturnValue(authc);
    defineHasApiKeysRoutes(mockRouteDefinitionParams);
    [[, routeHandler]] = mockRouteDefinitionParams.router.get.mock.calls;
    mockContext = coreMock.createCustomRequestHandlerContext({
      core: coreMock.createRequestHandlerContext(),
      licensing: licensingMock.createRequestHandlerContext(),
    });

    esClientMock = (await mockContext.core).elasticsearch.client;

    authc.apiKeys.areAPIKeysEnabled.mockResolvedValue(true);
    authc.apiKeys.areCrossClusterAPIKeysEnabled.mockResolvedValue(true);

    esClientMock.asCurrentUser.security.getApiKey.mockResponse({
      api_keys: [
        { id: '123', invalidated: false },
        { id: '456', invalidated: true },
      ],
    } as any);
  });

  it('should calculate when user has API keys', async () => {
    const response = await routeHandler(
      mockContext,
      httpServerMock.createKibanaRequest(),
      kibanaResponseFactory
    );

    expect(response.payload).toEqual(
      expect.objectContaining({
        hasApiKeys: true,
      })
    );
    expect(esClientMock.asCurrentUser.security.getApiKey).toHaveBeenCalledTimes(1);
    expect(esClientMock.asCurrentUser.security.getApiKey).toHaveBeenCalledWith({
      owner: true,
      active_only: true,
    });
  });

  it('should calculate when user does not have API keys', async () => {
    esClientMock.asCurrentUser.security.getApiKey.mockResponse({
      api_keys: [],
    });

    const response = await routeHandler(
      mockContext,
      httpServerMock.createKibanaRequest(),
      kibanaResponseFactory
    );

    expect(response.payload).toEqual(
      expect.objectContaining({
        hasApiKeys: false,
      })
    );
  });

  it('should filter out invalidated API keys', async () => {
    const response = await routeHandler(
      mockContext,
      httpServerMock.createKibanaRequest(),
      kibanaResponseFactory
    );

    expect(response.status).toBe(200);
    expect(response.payload?.hasApiKeys).toBe(true);
  });

  it('should return `404` if API keys are disabled', async () => {
    authc.apiKeys.areAPIKeysEnabled.mockResolvedValue(false);

    const response = await routeHandler(
      mockContext,
      httpServerMock.createKibanaRequest(),
      kibanaResponseFactory
    );

    expect(response.status).toBe(404);
    expect(response.payload).toEqual({
      message:
        "API keys are disabled in Elasticsearch. To use API keys enable 'xpack.security.authc.api_key.enabled' setting.",
    });
  });
});
