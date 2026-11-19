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

import { defineBulkDeleteOAuthConnectionsRoute } from './bulk_delete_connections';
import type { InternalAuthenticationServiceStart } from '../../authentication';
import { authenticationServiceMock } from '../../authentication/authentication_service.mock';
import { routeDefinitionParamsMock } from '../index.mock';

interface ConnectionTarget {
  client_id: string;
  connection_id: string;
}

describe('Bulk delete OAuth connections route', () => {
  function getMockContext(
    licenseCheckResult: { state: string; message?: string } = { state: 'valid' }
  ) {
    const coreContext = coreMock.createRequestHandlerContext();
    return coreMock.createCustomRequestHandlerContext({
      core: coreContext,
      licensing: { license: { check: jest.fn().mockReturnValue(licenseCheckResult) } },
    });
  }

  const createRequest = (connections: ConnectionTarget[], authorization = 'Bearer essu_token') =>
    httpServerMock.createKibanaRequest({
      headers: { authorization },
      body: { connections },
    });

  let routeHandler: RequestHandler<any, any, any, any>;
  let authc: DeeplyMockedKeys<InternalAuthenticationServiceStart>;
  let oauthMock: jest.Mocked<UiamOAuthType>;

  beforeEach(() => {
    authc = authenticationServiceMock.createStart();
    oauthMock = authc.oauth as jest.Mocked<UiamOAuthType>;
    const mockRouteDefinitionParams = routeDefinitionParamsMock.create();
    mockRouteDefinitionParams.getAuthenticationService.mockReturnValue(authc);

    defineBulkDeleteOAuthConnectionsRoute(mockRouteDefinitionParams);

    const [, handler] = mockRouteDefinitionParams.router.post.mock.calls.find(
      ([{ path }]) => path === '/internal/security/oauth/connections/_bulk_delete'
    )!;
    routeHandler = handler;
  });

  it('returns a per-item deleted result when all items succeed', async () => {
    oauthMock.deleteConnection.mockResolvedValue(true);

    const response = await routeHandler(
      getMockContext(),
      createRequest([
        { client_id: 'client-1', connection_id: 'conn-1' },
        { client_id: 'client-2', connection_id: 'conn-2' },
      ]),
      kibanaResponseFactory
    );

    expect(response.status).toBe(200);
    expect(response.payload).toEqual({
      results: [
        { client_id: 'client-1', connection_id: 'conn-1', status: 'deleted' },
        { client_id: 'client-2', connection_id: 'conn-2', status: 'deleted' },
      ],
    });
    expect(oauthMock.deleteConnection).toHaveBeenCalledTimes(2);
    expect(oauthMock.deleteConnection).toHaveBeenNthCalledWith(
      1,
      expect.anything(),
      'client-1',
      'conn-1'
    );
    expect(oauthMock.deleteConnection).toHaveBeenNthCalledWith(
      2,
      expect.anything(),
      'client-2',
      'conn-2'
    );
  });

  it('reports per-item failures alongside successes without failing the request', async () => {
    oauthMock.deleteConnection.mockImplementation(async (_request, _clientId, connectionId) => {
      if (connectionId === 'conn-2') {
        throw Boom.notFound('Connection not found');
      }
      return true;
    });

    const response = await routeHandler(
      getMockContext(),
      createRequest([
        { client_id: 'client-1', connection_id: 'conn-1' },
        { client_id: 'client-1', connection_id: 'conn-2' },
      ]),
      kibanaResponseFactory
    );

    expect(response.status).toBe(200);
    expect(response.payload).toEqual({
      results: [
        { client_id: 'client-1', connection_id: 'conn-1', status: 'deleted' },
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
    oauthMock.deleteConnection.mockImplementation(async () => {
      const order = callOrder++;
      await new Promise((resolve) => setTimeout(resolve, order === 0 ? 10 : 0));
      return true;
    });

    const response = await routeHandler(
      getMockContext(),
      createRequest([
        { client_id: 'client-a', connection_id: 'conn-a' },
        { client_id: 'client-b', connection_id: 'conn-b' },
        { client_id: 'client-c', connection_id: 'conn-c' },
      ]),
      kibanaResponseFactory
    );

    expect(response.status).toBe(200);
    expect(response.payload).toEqual({
      results: [
        { client_id: 'client-a', connection_id: 'conn-a', status: 'deleted' },
        { client_id: 'client-b', connection_id: 'conn-b', status: 'deleted' },
        { client_id: 'client-c', connection_id: 'conn-c', status: 'deleted' },
      ],
    });
  });

  it('collapses duplicate targets into a single delete and a single result', async () => {
    oauthMock.deleteConnection.mockResolvedValue(true);

    const response = await routeHandler(
      getMockContext(),
      createRequest([
        { client_id: 'client-1', connection_id: 'conn-1' },
        { client_id: 'client-1', connection_id: 'conn-2' },
        { client_id: 'client-1', connection_id: 'conn-1' },
      ]),
      kibanaResponseFactory
    );

    expect(response.status).toBe(200);
    expect(response.payload).toEqual({
      results: [
        { client_id: 'client-1', connection_id: 'conn-1', status: 'deleted' },
        { client_id: 'client-1', connection_id: 'conn-2', status: 'deleted' },
      ],
    });
    expect(oauthMock.deleteConnection).toHaveBeenCalledTimes(2);
  });

  it('treats the same connection id under different clients as distinct targets', async () => {
    oauthMock.deleteConnection.mockResolvedValue(true);

    const response = await routeHandler(
      getMockContext(),
      createRequest([
        { client_id: 'client-1', connection_id: 'conn-1' },
        { client_id: 'client-2', connection_id: 'conn-1' },
      ]),
      kibanaResponseFactory
    );

    expect(response.status).toBe(200);
    expect(response.payload).toEqual({
      results: [
        { client_id: 'client-1', connection_id: 'conn-1', status: 'deleted' },
        { client_id: 'client-2', connection_id: 'conn-1', status: 'deleted' },
      ],
    });
    expect(oauthMock.deleteConnection).toHaveBeenCalledTimes(2);
  });

  it('returns 404 when OAuth is not available', async () => {
    authc.oauth = null;

    const response = await routeHandler(
      getMockContext(),
      createRequest([{ client_id: 'client-1', connection_id: 'conn-1' }]),
      kibanaResponseFactory
    );

    expect(response.status).toBe(404);
  });

  it('returns 401 for the whole request when the authorization header is missing', async () => {
    const response = await routeHandler(
      getMockContext(),
      httpServerMock.createKibanaRequest({
        body: { connections: [{ client_id: 'client-1', connection_id: 'conn-1' }] },
      }),
      kibanaResponseFactory
    );

    expect(response.status).toBe(401);
    expect(oauthMock.deleteConnection).not.toHaveBeenCalled();
  });

  it('returns 400 for the whole request when the credential is not compatible with UIAM', async () => {
    const response = await routeHandler(
      getMockContext(),
      createRequest(
        [
          { client_id: 'client-1', connection_id: 'conn-1' },
          { client_id: 'client-1', connection_id: 'conn-2' },
        ],
        'Bearer not-a-uiam-token'
      ),
      kibanaResponseFactory
    );

    expect(response.status).toBe(400);
    expect(oauthMock.deleteConnection).not.toHaveBeenCalled();
  });

  it('returns 404 when security features are disabled (null upstream result)', async () => {
    oauthMock.deleteConnection.mockResolvedValue(null);

    const response = await routeHandler(
      getMockContext(),
      createRequest([
        { client_id: 'client-1', connection_id: 'conn-1' },
        { client_id: 'client-1', connection_id: 'conn-2' },
      ]),
      kibanaResponseFactory
    );

    expect(response.status).toBe(404);
  });

  it('reports per-item errors for null upstream results when some items succeed', async () => {
    oauthMock.deleteConnection.mockImplementation(async (_request, _clientId, connectionId) =>
      connectionId === 'conn-2' ? null : true
    );

    const response = await routeHandler(
      getMockContext(),
      createRequest([
        { client_id: 'client-1', connection_id: 'conn-1' },
        { client_id: 'client-1', connection_id: 'conn-2' },
      ]),
      kibanaResponseFactory
    );

    expect(response.status).toBe(200);
    expect(response.payload).toEqual({
      results: [
        { client_id: 'client-1', connection_id: 'conn-1', status: 'deleted' },
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
