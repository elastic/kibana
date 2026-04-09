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

import { defineUpdateOAuthClientRoute } from './update_client';
import type { InternalAuthenticationServiceStart } from '../../authentication';
import { authenticationServiceMock } from '../../authentication/authentication_service.mock';
import { routeDefinitionParamsMock } from '../index.mock';

describe('Update OAuth Client route', () => {
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

    defineUpdateOAuthClientRoute(mockRouteDefinitionParams);

    const [, handler] = mockRouteDefinitionParams.router.patch.mock.calls.find(
      ([{ path }]) => path === '/internal/security/oauth/clients/{client_id}'
    )!;
    routeHandler = handler;
  });

  it('returns updated client on success', async () => {
    const mockClient = { id: 'c1', resource: 'urn:test', client_name: 'Updated' };
    oauthMock.updateClient.mockResolvedValue(mockClient);

    const response = await routeHandler(
      getMockContext(),
      httpServerMock.createKibanaRequest({
        params: { client_id: 'c1' },
        body: { client_name: 'Updated', client_metadata: {} },
      }),
      kibanaResponseFactory
    );

    expect(response.status).toBe(200);
    expect(response.payload).toEqual(mockClient);
  });

  it('returns 404 when OAuth is not available', async () => {
    authc.oauth = null;

    const response = await routeHandler(
      getMockContext(),
      httpServerMock.createKibanaRequest({
        params: { client_id: 'c1' },
        body: { client_metadata: {} },
      }),
      kibanaResponseFactory
    );

    expect(response.status).toBe(404);
  });

  it('returns error from service', async () => {
    oauthMock.updateClient.mockRejectedValue(Boom.notFound('Not found'));

    const response = await routeHandler(
      getMockContext(),
      httpServerMock.createKibanaRequest({
        params: { client_id: 'c1' },
        body: { client_metadata: {} },
      }),
      kibanaResponseFactory
    );

    expect(response.status).toBe(404);
  });
});
