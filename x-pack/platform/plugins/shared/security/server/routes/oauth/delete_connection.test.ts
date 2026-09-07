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

import { defineDeleteOAuthConnectionRoute } from './delete_connection';
import type { InternalAuthenticationServiceStart } from '../../authentication';
import { authenticationServiceMock } from '../../authentication/authentication_service.mock';
import { routeDefinitionParamsMock } from '../index.mock';

describe('Delete OAuth Connection route', () => {
  function getMockContext(
    licenseCheckResult: { state: string; message?: string } = { state: 'valid' }
  ) {
    const coreContext = coreMock.createRequestHandlerContext();
    return coreMock.createCustomRequestHandlerContext({
      core: coreContext,
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

    defineDeleteOAuthConnectionRoute(mockRouteDefinitionParams);

    const [, handler] = mockRouteDefinitionParams.router.delete.mock.calls.find(
      ([{ path }]) =>
        path === '/internal/security/oauth/clients/{client_id}/connections/{connection_id}'
    )!;
    routeHandler = handler;
  });

  it('returns 204 with no body on success', async () => {
    oauthMock.deleteConnection.mockResolvedValue(true);

    const response = await routeHandler(
      getMockContext(),
      httpServerMock.createKibanaRequest({
        params: { client_id: 'c1', connection_id: 'conn-1' },
      }),
      kibanaResponseFactory
    );

    expect(response.status).toBe(204);
    expect(response.payload).toBeUndefined();
    expect(oauthMock.deleteConnection).toHaveBeenCalledWith(expect.anything(), 'c1', 'conn-1');
  });

  it('returns 404 when OAuth is not available', async () => {
    authc.oauth = null;

    const response = await routeHandler(
      getMockContext(),
      httpServerMock.createKibanaRequest({
        params: { client_id: 'c1', connection_id: 'conn-1' },
      }),
      kibanaResponseFactory
    );

    expect(response.status).toBe(404);
  });

  it('returns 404 when security features are disabled', async () => {
    oauthMock.deleteConnection.mockResolvedValue(null);

    const response = await routeHandler(
      getMockContext(),
      httpServerMock.createKibanaRequest({
        params: { client_id: 'c1', connection_id: 'conn-1' },
      }),
      kibanaResponseFactory
    );

    expect(response.status).toBe(404);
  });

  it('returns error from service', async () => {
    oauthMock.deleteConnection.mockRejectedValue(Boom.notFound('OAuth connection not found'));

    const response = await routeHandler(
      getMockContext(),
      httpServerMock.createKibanaRequest({
        params: { client_id: 'c1', connection_id: 'conn-1' },
      }),
      kibanaResponseFactory
    );

    expect(response.status).toBe(404);
  });
});
