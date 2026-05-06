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
import type { UiamOAuthType } from '@kbn/core-security-server';
import type { DeeplyMockedKeys } from '@kbn/utility-types-jest';

import { defineGetOAuthConnectionRoute } from './get_connection';
import type { InternalAuthenticationServiceStart } from '../../authentication';
import { authenticationServiceMock } from '../../authentication/authentication_service.mock';
import { routeDefinitionParamsMock } from '../index.mock';

describe('Get OAuth Connection route', () => {
  function getMockContext(
    licenseCheckResult: { state: string; message?: string } = { state: 'valid' }
  ) {
    return coreMock.createCustomRequestHandlerContext({
      licensing: { license: { check: jest.fn().mockReturnValue(licenseCheckResult) } },
    });
  }

  let routeHandler: RequestHandler<any, any, any, any>;
  let authc: DeeplyMockedKeys<InternalAuthenticationServiceStart>;
  let oauthMock: jest.Mocked<UiamOAuthType>;
  beforeEach(() => {
    authc = authenticationServiceMock.createStart();
    oauthMock = authc.oauth as jest.Mocked<UiamOAuthType>;
    const mockRouteDefinitionParams = routeDefinitionParamsMock.create();
    mockRouteDefinitionParams.getAuthenticationService.mockReturnValue(authc);

    defineGetOAuthConnectionRoute(mockRouteDefinitionParams);

    const [, handler] = mockRouteDefinitionParams.router.get.mock.calls.find(
      ([{ path }]) =>
        path === '/internal/security/oauth/clients/{client_id}/connections/{connection_id}'
    )!;
    routeHandler = handler;
  });

  it('returns result of license checker', async () => {
    const mockContext = getMockContext({ state: 'invalid', message: 'test forbidden message' });
    const response = await routeHandler(
      mockContext,
      httpServerMock.createKibanaRequest(),
      kibanaResponseFactory
    );

    expect(response.status).toBe(403);
    expect(response.payload).toEqual({ message: 'test forbidden message' });
  });

  it('returns single connection on success', async () => {
    const mockConnection = {
      id: 'conn-1',
      client_id: 'client-1',
      resource: 'https://test-project.kb.us-central1.gcp.elastic.cloud',
    };
    oauthMock.listConnections.mockResolvedValue({ connections: [mockConnection] });

    const response = await routeHandler(
      getMockContext(),
      httpServerMock.createKibanaRequest({
        params: { client_id: 'client-1', connection_id: 'conn-1' },
      }),
      kibanaResponseFactory
    );

    expect(response.status).toBe(200);
    expect(response.payload).toEqual(mockConnection);
    expect(oauthMock.listConnections).toHaveBeenCalledWith(expect.anything(), 'client-1', 'conn-1');
  });

  it('returns 404 when connection is not found', async () => {
    oauthMock.listConnections.mockResolvedValue({ connections: [] });

    const response = await routeHandler(
      getMockContext(),
      httpServerMock.createKibanaRequest({
        params: { client_id: 'client-1', connection_id: 'nonexistent' },
      }),
      kibanaResponseFactory
    );

    expect(response.status).toBe(404);
  });

  it('returns 404 when OAuth is not available', async () => {
    authc.oauth = null;

    const response = await routeHandler(
      getMockContext(),
      httpServerMock.createKibanaRequest({
        params: { client_id: 'client-1', connection_id: 'conn-1' },
      }),
      kibanaResponseFactory
    );

    expect(response.status).toBe(404);
  });

  it('returns error from service', async () => {
    oauthMock.listConnections.mockRejectedValue(Boom.forbidden('Forbidden'));

    const response = await routeHandler(
      getMockContext(),
      httpServerMock.createKibanaRequest({
        params: { client_id: 'client-1', connection_id: 'conn-1' },
      }),
      kibanaResponseFactory
    );

    expect(response.status).toBe(403);
  });
});
