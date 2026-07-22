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
import type { UiamOAuthConnectionResponse, UiamOAuthType } from '@kbn/core-security-server';
import type { DeeplyMockedKeys } from '@kbn/utility-types-jest';

import { defineBulkRevokeOAuthConnectionsRoute } from './bulk_revoke_connections';
import type { InternalAuthenticationServiceStart } from '../../authentication';
import { authenticationServiceMock } from '../../authentication/authentication_service.mock';
import { routeDefinitionParamsMock } from '../index.mock';

describe('Bulk revoke OAuth connections route', () => {
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

  const buildConnection = (
    overrides: Partial<UiamOAuthConnectionResponse> = {}
  ): UiamOAuthConnectionResponse => ({
    id: 'conn-1',
    client_id: 'client-1',
    resource: 'https://test-project.kb.us-central1.gcp.elastic.cloud',
    revoked: true,
    ...overrides,
  });

  let routeHandler: RequestHandler<any, any, any, any>;
  let authc: DeeplyMockedKeys<InternalAuthenticationServiceStart>;
  let oauthMock: jest.Mocked<UiamOAuthType>;

  beforeEach(() => {
    authc = authenticationServiceMock.createStart();
    oauthMock = authc.oauth as jest.Mocked<UiamOAuthType>;
    const mockRouteDefinitionParams = routeDefinitionParamsMock.create();
    mockRouteDefinitionParams.getAuthenticationService.mockReturnValue(authc);

    defineBulkRevokeOAuthConnectionsRoute(mockRouteDefinitionParams);

    const [, handler] = mockRouteDefinitionParams.router.post.mock.calls.find(
      ([{ path }]) => path === '/internal/security/oauth/connections/_bulk_revoke'
    )!;
    routeHandler = handler;
  });

  it('returns a per-item revoked result when all items succeed', async () => {
    oauthMock.revokeConnection.mockImplementation(async (_request, clientId, connectionId) =>
      buildConnection({ id: connectionId, client_id: clientId })
    );

    const response = await routeHandler(
      getMockContext(),
      httpServerMock.createKibanaRequest({
        body: {
          connections: [
            { client_id: 'client-1', connection_id: 'conn-1' },
            { client_id: 'client-2', connection_id: 'conn-2' },
          ],
          reason: 'bulk revoked by user',
        },
      }),
      kibanaResponseFactory
    );

    expect(response.status).toBe(200);
    expect(response.payload).toEqual({
      results: [
        { client_id: 'client-1', connection_id: 'conn-1', status: 'revoked' },
        { client_id: 'client-2', connection_id: 'conn-2', status: 'revoked' },
      ],
    });
    expect(oauthMock.revokeConnection).toHaveBeenCalledTimes(2);
    expect(oauthMock.revokeConnection).toHaveBeenNthCalledWith(
      1,
      expect.anything(),
      'client-1',
      'conn-1',
      'bulk revoked by user'
    );
    expect(oauthMock.revokeConnection).toHaveBeenNthCalledWith(
      2,
      expect.anything(),
      'client-2',
      'conn-2',
      'bulk revoked by user'
    );
  });

  it('reports per-item failures alongside successes without failing the request', async () => {
    oauthMock.revokeConnection.mockImplementation(async (_request, _clientId, connectionId) => {
      if (connectionId === 'conn-2') {
        throw Boom.notFound('Connection not found');
      }
      return buildConnection({ id: connectionId });
    });

    const response = await routeHandler(
      getMockContext(),
      httpServerMock.createKibanaRequest({
        body: {
          connections: [
            { client_id: 'client-1', connection_id: 'conn-1' },
            { client_id: 'client-1', connection_id: 'conn-2' },
          ],
        },
      }),
      kibanaResponseFactory
    );

    expect(response.status).toBe(200);
    expect(response.payload).toEqual({
      results: [
        { client_id: 'client-1', connection_id: 'conn-1', status: 'revoked' },
        {
          client_id: 'client-1',
          connection_id: 'conn-2',
          status: 'error',
          status_code: 404,
          message: 'Connection not found',
        },
      ],
    });
  });

  it('preserves the order of the input connections in the results array', async () => {
    let callOrder = 0;
    oauthMock.revokeConnection.mockImplementation(async (_request, _clientId, connectionId) => {
      const order = callOrder++;
      await new Promise((resolve) => setTimeout(resolve, order === 0 ? 10 : 0));
      return buildConnection({ id: connectionId });
    });

    const response = await routeHandler(
      getMockContext(),
      httpServerMock.createKibanaRequest({
        body: {
          connections: [
            { client_id: 'client-a', connection_id: 'conn-a' },
            { client_id: 'client-b', connection_id: 'conn-b' },
            { client_id: 'client-c', connection_id: 'conn-c' },
          ],
        },
      }),
      kibanaResponseFactory
    );

    expect(response.status).toBe(200);
    expect(response.payload).toEqual({
      results: [
        { client_id: 'client-a', connection_id: 'conn-a', status: 'revoked' },
        { client_id: 'client-b', connection_id: 'conn-b', status: 'revoked' },
        { client_id: 'client-c', connection_id: 'conn-c', status: 'revoked' },
      ],
    });
  });

  it('returns 404 when OAuth is not available', async () => {
    authc.oauth = null;

    const response = await routeHandler(
      getMockContext(),
      httpServerMock.createKibanaRequest({
        body: {
          connections: [{ client_id: 'client-1', connection_id: 'conn-1' }],
        },
      }),
      kibanaResponseFactory
    );

    expect(response.status).toBe(404);
  });

  it('returns 404 when uiamOAuthClientManagement setting is disabled', async () => {
    const response = await routeHandler(
      getMockContext({ state: 'valid' }, { oauthManagementEnabled: false }),
      httpServerMock.createKibanaRequest({
        body: {
          connections: [{ client_id: 'client-1', connection_id: 'conn-1' }],
        },
      }),
      kibanaResponseFactory
    );

    expect(response.status).toBe(404);
    expect(oauthMock.revokeConnection).not.toHaveBeenCalled();
  });

  it('returns 404 when security features are disabled (null upstream result)', async () => {
    oauthMock.revokeConnection.mockResolvedValue(null);

    const response = await routeHandler(
      getMockContext(),
      httpServerMock.createKibanaRequest({
        body: {
          connections: [
            { client_id: 'client-1', connection_id: 'conn-1' },
            { client_id: 'client-1', connection_id: 'conn-2' },
          ],
        },
      }),
      kibanaResponseFactory
    );

    expect(response.status).toBe(404);
  });

  it('reports per-item errors for null upstream results when some items succeed', async () => {
    oauthMock.revokeConnection.mockImplementation(async (_request, _clientId, connectionId) => {
      if (connectionId === 'conn-2') {
        return null;
      }
      return buildConnection({ id: connectionId });
    });

    const response = await routeHandler(
      getMockContext(),
      httpServerMock.createKibanaRequest({
        body: {
          connections: [
            { client_id: 'client-1', connection_id: 'conn-1' },
            { client_id: 'client-1', connection_id: 'conn-2' },
          ],
        },
      }),
      kibanaResponseFactory
    );

    expect(response.status).toBe(200);
    expect(response.payload).toEqual({
      results: [
        { client_id: 'client-1', connection_id: 'conn-1', status: 'revoked' },
        {
          client_id: 'client-1',
          connection_id: 'conn-2',
          status: 'error',
          status_code: 404,
          message: 'OAuth management is not available: security features are disabled',
        },
      ],
    });
  });
});
