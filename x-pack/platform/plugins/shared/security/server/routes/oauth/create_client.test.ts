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

import { defineCreateOAuthClientRoute } from './create_client';
import type { InternalAuthenticationServiceStart } from '../../authentication';
import { authenticationServiceMock } from '../../authentication/authentication_service.mock';
import { routeDefinitionParamsMock } from '../index.mock';

describe('Create OAuth Client route', () => {
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

    defineCreateOAuthClientRoute(mockRouteDefinitionParams);

    const [, handler] = mockRouteDefinitionParams.router.post.mock.calls.find(
      ([{ path }]) => path === '/internal/security/oauth/clients'
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

  it('returns created client on success', async () => {
    const mockClient = {
      id: 'client-1',
      resource: 'https://test-project.kb.us-central1.gcp.elastic.cloud',
      client_name: 'Test',
    };
    oauthMock.createClient.mockResolvedValue(mockClient);

    const response = await routeHandler(
      getMockContext(),
      httpServerMock.createKibanaRequest({
        body: {
          resource: 'https://test-project.kb.us-central1.gcp.elastic.cloud',
          client_name: 'Test',
        },
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
        body: { resource: 'https://test-project.kb.us-central1.gcp.elastic.cloud' },
      }),
      kibanaResponseFactory
    );

    expect(response.status).toBe(404);
  });

  it('returns error from service', async () => {
    const error = Boom.badRequest('Invalid resource');
    oauthMock.createClient.mockRejectedValue(error);

    const response = await routeHandler(
      getMockContext(),
      httpServerMock.createKibanaRequest({
        body: { resource: 'https://test-project.kb.us-central1.gcp.elastic.cloud' },
      }),
      kibanaResponseFactory
    );

    expect(response.status).toBe(400);
  });
});
