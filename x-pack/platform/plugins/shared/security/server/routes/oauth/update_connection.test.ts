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

import { defineUpdateOAuthConnectionRoute } from './update_connection';
import type { InternalAuthenticationServiceStart } from '../../authentication';
import { authenticationServiceMock } from '../../authentication/authentication_service.mock';
import { routeDefinitionParamsMock } from '../index.mock';

describe('Update OAuth Connection route', () => {
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

    defineUpdateOAuthConnectionRoute(mockRouteDefinitionParams);

    const [, handler] = mockRouteDefinitionParams.router.patch.mock.calls.find(
      ([{ path }]) =>
        path === '/internal/security/oauth/clients/{client_id}/connections/{connection_id}'
    )!;
    routeHandler = handler;
  });

  it('returns updated connection on success', async () => {
    const mockConnection = {
      id: 'conn1',
      client_id: 'c1',
      resource: 'https://test-project.kb.us-central1.gcp.elastic.cloud',
      name: 'Updated',
    };
    oauthMock.updateConnection.mockResolvedValue(mockConnection);

    const response = await routeHandler(
      getMockContext(),
      httpServerMock.createKibanaRequest({
        params: { client_id: 'c1', connection_id: 'conn1' },
        body: { name: 'Updated' },
      }),
      kibanaResponseFactory
    );

    expect(response.status).toBe(200);
    expect(response.payload).toEqual(mockConnection);
    expect(oauthMock.updateConnection).toHaveBeenCalledWith(expect.anything(), 'c1', 'conn1', {
      name: 'Updated',
    });
  });

  it('returns 404 when OAuth is not available', async () => {
    authc.oauth = null;

    const response = await routeHandler(
      getMockContext(),
      httpServerMock.createKibanaRequest({
        params: { client_id: 'c1', connection_id: 'conn1' },
        body: { name: 'Updated' },
      }),
      kibanaResponseFactory
    );

    expect(response.status).toBe(404);
  });

  it('returns 404 when license-disabled service returns null', async () => {
    oauthMock.updateConnection.mockResolvedValue(null);

    const response = await routeHandler(
      getMockContext(),
      httpServerMock.createKibanaRequest({
        params: { client_id: 'c1', connection_id: 'conn1' },
        body: { name: 'Updated' },
      }),
      kibanaResponseFactory
    );

    expect(response.status).toBe(404);
  });

  it('returns error from service', async () => {
    oauthMock.updateConnection.mockRejectedValue(Boom.notFound('Connection not found'));

    const response = await routeHandler(
      getMockContext(),
      httpServerMock.createKibanaRequest({
        params: { client_id: 'c1', connection_id: 'missing' },
        body: { name: 'Updated' },
      }),
      kibanaResponseFactory
    );

    expect(response.status).toBe(404);
  });
});
