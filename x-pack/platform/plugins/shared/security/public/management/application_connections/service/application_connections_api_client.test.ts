/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServiceMock } from '@kbn/core/public/mocks';

import { ApplicationConnectionsAPIClient } from './application_connections_api_client';

describe('ApplicationConnectionsAPIClient', () => {
  it('listClients() calls GET /internal/security/oauth/clients', async () => {
    const httpMock = httpServiceMock.createStartContract();
    const mockResponse = { clients: [] };
    httpMock.get.mockResolvedValue(mockResponse);

    const client = new ApplicationConnectionsAPIClient(httpMock);

    await expect(client.listClients()).resolves.toBe(mockResponse);
    expect(httpMock.get).toHaveBeenCalledTimes(1);
    expect(httpMock.get).toHaveBeenCalledWith('/internal/security/oauth/clients');
  });

  it('listConnections() calls GET /internal/security/oauth/connections', async () => {
    const httpMock = httpServiceMock.createStartContract();
    const mockResponse = { connections: [] };
    httpMock.get.mockResolvedValue(mockResponse);

    const client = new ApplicationConnectionsAPIClient(httpMock);

    await expect(client.listConnections()).resolves.toBe(mockResponse);
    expect(httpMock.get).toHaveBeenCalledTimes(1);
    expect(httpMock.get).toHaveBeenCalledWith('/internal/security/oauth/connections');
  });

  it('revokeClient() POSTs to the correct URL and encodes the client_id', async () => {
    const httpMock = httpServiceMock.createStartContract();
    httpMock.post.mockResolvedValue({});

    const client = new ApplicationConnectionsAPIClient(httpMock);

    await client.revokeClient('abc/123', 'user_request');
    expect(httpMock.post).toHaveBeenCalledTimes(1);
    expect(httpMock.post).toHaveBeenCalledWith(
      '/internal/security/oauth/clients/abc%2F123/_revoke',
      { body: JSON.stringify({ reason: 'user_request' }) }
    );
  });

  it('revokeClient() omits the reason when not provided', async () => {
    const httpMock = httpServiceMock.createStartContract();
    httpMock.post.mockResolvedValue({});

    const client = new ApplicationConnectionsAPIClient(httpMock);

    await client.revokeClient('client-1');
    expect(httpMock.post).toHaveBeenCalledWith(
      '/internal/security/oauth/clients/client-1/_revoke',
      { body: JSON.stringify({ reason: undefined }) }
    );
  });

  it('revokeConnection() POSTs to the nested revoke URL', async () => {
    const httpMock = httpServiceMock.createStartContract();
    httpMock.post.mockResolvedValue({});

    const client = new ApplicationConnectionsAPIClient(httpMock);

    await client.revokeConnection('client-1', 'conn-1');
    expect(httpMock.post).toHaveBeenCalledTimes(1);
    expect(httpMock.post).toHaveBeenCalledWith(
      '/internal/security/oauth/clients/client-1/connections/conn-1/_revoke',
      { body: JSON.stringify({ reason: undefined }) }
    );
  });

  it('revokeConnection() encodes ids with reserved characters', async () => {
    const httpMock = httpServiceMock.createStartContract();
    httpMock.post.mockResolvedValue({});

    const client = new ApplicationConnectionsAPIClient(httpMock);

    await client.revokeConnection('client/1', 'conn#1', 'admin_revoke');
    expect(httpMock.post).toHaveBeenCalledWith(
      '/internal/security/oauth/clients/client%2F1/connections/conn%231/_revoke',
      { body: JSON.stringify({ reason: 'admin_revoke' }) }
    );
  });

  it('bulkDeleteConnections() POSTs snake_case targets to the bulk delete URL', async () => {
    const httpMock = httpServiceMock.createStartContract();
    httpMock.post.mockResolvedValue({ results: [] });

    const client = new ApplicationConnectionsAPIClient(httpMock);

    await client.bulkDeleteConnections([
      { clientId: 'client-1', connectionId: 'conn-1' },
      { clientId: 'client-2', connectionId: 'conn-2' },
    ]);

    expect(httpMock.post).toHaveBeenCalledTimes(1);
    expect(httpMock.post).toHaveBeenCalledWith(
      '/internal/security/oauth/connections/_bulk_delete',
      {
        body: JSON.stringify({
          connections: [
            { client_id: 'client-1', connection_id: 'conn-1' },
            { client_id: 'client-2', connection_id: 'conn-2' },
          ],
        }),
      }
    );
  });

  it('bulkDeleteConnections() maps the snake_case results to camelCase', async () => {
    const httpMock = httpServiceMock.createStartContract();
    httpMock.post.mockResolvedValue({
      results: [
        { client_id: 'client-1', connection_id: 'conn-1', status: 'deleted' },
        {
          client_id: 'client-2',
          connection_id: 'conn-2',
          status: 'error',
          status_code: 404,
          message: 'not found',
        },
      ],
    });

    const client = new ApplicationConnectionsAPIClient(httpMock);

    await expect(
      client.bulkDeleteConnections([
        { clientId: 'client-1', connectionId: 'conn-1' },
        { clientId: 'client-2', connectionId: 'conn-2' },
      ])
    ).resolves.toEqual({
      results: [
        {
          clientId: 'client-1',
          connectionId: 'conn-1',
          status: 'deleted',
          statusCode: undefined,
          message: undefined,
        },
        {
          clientId: 'client-2',
          connectionId: 'conn-2',
          status: 'error',
          statusCode: 404,
          message: 'not found',
        },
      ],
    });
  });
});
