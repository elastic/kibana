/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';

import type { ObjectType } from '@kbn/config-schema';
import type { RequestHandler, RouteConfig } from '@kbn/core/server';
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
    licenseCheckResult: { state: string; message?: string } = { state: 'valid' },
    { oauthManagementEnabled = true }: { oauthManagementEnabled?: boolean } = {}
  ) {
    const coreContext = coreMock.createRequestHandlerContext();
    (coreContext.uiSettings.client.get as jest.Mock).mockResolvedValue(oauthManagementEnabled);
    return coreMock.createCustomRequestHandlerContext({
      core: coreContext,
      licensing: { license: { check: jest.fn().mockReturnValue(licenseCheckResult) } },
    });
  }

  let routeConfig: RouteConfig<any, any, any, any>;
  let routeHandler: RequestHandler<any, any, any, any>;
  let authc: DeeplyMockedKeys<InternalAuthenticationServiceStart>;
  let oauthMock: jest.Mocked<UiamOAuthType>;
  beforeEach(() => {
    authc = authenticationServiceMock.createStart();
    oauthMock = authc.oauth as jest.Mocked<UiamOAuthType>;
    const mockRouteDefinitionParams = routeDefinitionParamsMock.create();
    mockRouteDefinitionParams.getAuthenticationService.mockReturnValue(authc);

    defineUpdateOAuthClientRoute(mockRouteDefinitionParams);

    const [config, handler] = mockRouteDefinitionParams.router.patch.mock.calls.find(
      ([{ path }]) => path === '/internal/security/oauth/clients/{client_id}'
    )!;
    routeConfig = config;
    routeHandler = handler;
  });

  it('returns updated client on success', async () => {
    const mockClient = {
      id: 'c1',
      resource: 'https://test-project.kb.us-central1.gcp.elastic.cloud',
      client_name: 'Updated',
    };
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

  describe('client_name length validation aligned with UIAM (128)', () => {
    const getBodySchema = () => (routeConfig.validate as any).body as ObjectType;

    it('accepts a client_name at the 128-character limit', () => {
      expect(() => getBodySchema().validate({ client_name: 'a'.repeat(128) })).not.toThrow();
    });

    it('rejects a client_name over the 128-character limit', () => {
      expect(() => getBodySchema().validate({ client_name: 'a'.repeat(129) })).toThrow(
        /client_name/
      );
    });
  });

  describe('redirect_uris size validation aligned with UIAM (20)', () => {
    const getBodySchema = () => (routeConfig.validate as any).body as ObjectType;
    const uri = 'https://example.com/cb';

    it('accepts 20 redirect URIs', () => {
      expect(() =>
        getBodySchema().validate({ redirect_uris: Array.from({ length: 20 }, () => uri) })
      ).not.toThrow();
    });

    it('rejects 21 redirect URIs', () => {
      expect(() =>
        getBodySchema().validate({ redirect_uris: Array.from({ length: 21 }, () => uri) })
      ).toThrow(/redirect_uris/);
    });
  });

  it('defaults client_metadata to {} when omitted to satisfy UIAM PATCH contract', async () => {
    oauthMock.updateClient.mockResolvedValue({
      id: 'c1',
      resource: 'https://test-project.kb.us-central1.gcp.elastic.cloud',
    });

    await routeHandler(
      getMockContext(),
      httpServerMock.createKibanaRequest({
        params: { client_id: 'c1' },
        body: { client_name: 'Updated' },
      }),
      kibanaResponseFactory
    );

    expect(oauthMock.updateClient).toHaveBeenCalledWith(expect.anything(), 'c1', {
      client_name: 'Updated',
      client_metadata: {},
    });
  });

  it('forwards redirect_uris to the service when provided', async () => {
    oauthMock.updateClient.mockResolvedValue({
      id: 'c1',
      resource: 'https://test-project.kb.us-central1.gcp.elastic.cloud',
    });

    await routeHandler(
      getMockContext(),
      httpServerMock.createKibanaRequest({
        params: { client_id: 'c1' },
        body: { redirect_uris: ['https://example.com/cb'] },
      }),
      kibanaResponseFactory
    );

    expect(oauthMock.updateClient).toHaveBeenCalledWith(expect.anything(), 'c1', {
      redirect_uris: ['https://example.com/cb'],
      client_metadata: {},
    });
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

  it('returns 404 when uiamOAuthClientManagement setting is disabled', async () => {
    const response = await routeHandler(
      getMockContext({ state: 'valid' }, { oauthManagementEnabled: false }),
      httpServerMock.createKibanaRequest({
        params: { client_id: 'c1' },
        body: { client_metadata: {} },
      }),
      kibanaResponseFactory
    );

    expect(response.status).toBe(404);
    expect(oauthMock.updateClient).not.toHaveBeenCalled();
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
