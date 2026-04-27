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

import { defineApiKeyPrivilegesRoutes } from './privileges';
import type { InternalAuthenticationServiceStart } from '../../authentication';
import { authenticationServiceMock } from '../../authentication/authentication_service.mock';
import { routeDefinitionParamsMock } from '../index.mock';

describe('API key privileges route', () => {
  let routeHandler: RequestHandler<any, any, any, any>;
  let authc: DeeplyMockedKeys<InternalAuthenticationServiceStart>;
  let esClientMock: ScopedClusterClientMock;
  let mockContext: CustomRequestHandlerMock<unknown>;

  beforeEach(async () => {
    const mockRouteDefinitionParams = routeDefinitionParamsMock.create();
    authc = authenticationServiceMock.createStart();
    mockRouteDefinitionParams.getAuthenticationService.mockReturnValue(authc);

    defineApiKeyPrivilegesRoutes(mockRouteDefinitionParams);

    const [, handler] = mockRouteDefinitionParams.router.get.mock.calls.find(
      ([{ path }]) => path === '/internal/security/api_key/_privileges'
    )!;
    routeHandler = handler;

    mockContext = coreMock.createCustomRequestHandlerContext({
      core: coreMock.createRequestHandlerContext(),
      licensing: licensingMock.createRequestHandlerContext(),
    });

    esClientMock = (await mockContext.core).elasticsearch.client;

    authc.apiKeys.areAPIKeysEnabled.mockResolvedValue(true);
    esClientMock.asCurrentUser.security.hasPrivileges.mockResponse({
      username: 'test_user',
      has_all_requested: false,
      cluster: {
        manage_api_key: false,
        manage_own_api_key: false,
      },
      index: {},
      application: {},
    } as any);
  });

  it('returns correct privileges when user can manage all API keys', async () => {
    esClientMock.asCurrentUser.security.hasPrivileges.mockResponse({
      username: 'test_user',
      has_all_requested: true,
      cluster: { manage_api_key: true, manage_own_api_key: true },
      index: {},
      application: {},
    } as any);

    const response = await routeHandler(
      mockContext,
      httpServerMock.createKibanaRequest(),
      kibanaResponseFactory
    );

    expect(response.status).toBe(200);
    expect(response.payload).toEqual({
      areApiKeysEnabled: true,
      canManageApiKeys: true,
      canManageOwnApiKeys: true,
    });
  });

  it('returns correct privileges when user can only manage their own API keys', async () => {
    esClientMock.asCurrentUser.security.hasPrivileges.mockResponse({
      username: 'test_user',
      has_all_requested: false,
      cluster: { manage_api_key: false, manage_own_api_key: true },
      index: {},
      application: {},
    } as any);

    const response = await routeHandler(
      mockContext,
      httpServerMock.createKibanaRequest(),
      kibanaResponseFactory
    );

    expect(response.status).toBe(200);
    expect(response.payload).toEqual({
      areApiKeysEnabled: true,
      canManageApiKeys: false,
      canManageOwnApiKeys: true,
    });
  });

  it('returns correct privileges when user has no API key privileges', async () => {
    const response = await routeHandler(
      mockContext,
      httpServerMock.createKibanaRequest(),
      kibanaResponseFactory
    );

    expect(response.status).toBe(200);
    expect(response.payload).toEqual({
      areApiKeysEnabled: true,
      canManageApiKeys: false,
      canManageOwnApiKeys: false,
    });
  });

  it('reflects when API keys are disabled cluster-wide', async () => {
    authc.apiKeys.areAPIKeysEnabled.mockResolvedValue(false);
    esClientMock.asCurrentUser.security.hasPrivileges.mockResponse({
      username: 'test_user',
      has_all_requested: true,
      cluster: { manage_api_key: true, manage_own_api_key: true },
      index: {},
      application: {},
    } as any);

    const response = await routeHandler(
      mockContext,
      httpServerMock.createKibanaRequest(),
      kibanaResponseFactory
    );

    expect(response.status).toBe(200);
    expect(response.payload).toEqual({
      areApiKeysEnabled: false,
      canManageApiKeys: true,
      canManageOwnApiKeys: true,
    });
  });

  it('calls hasPrivileges with the expected cluster privileges', async () => {
    await routeHandler(mockContext, httpServerMock.createKibanaRequest(), kibanaResponseFactory);

    expect(esClientMock.asCurrentUser.security.hasPrivileges).toHaveBeenCalledWith({
      cluster: ['manage_api_key', 'manage_own_api_key'],
    });
  });
});
