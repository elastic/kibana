/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { OAuthClient } from '@kbn/agent-builder-common';
import type { HttpStart } from '@kbn/core/public';

export type {
  OAuthClient,
  OAuthClientLogo,
  OAuthClientConnectionsSummary,
} from '@kbn/agent-builder-common';

export interface OAuthConnectionUser {
  email?: string;
  first_name?: string;
  last_name?: string;
}

export interface OAuthConnection {
  id: string;
  client_id: string;
  client_name?: string;
  name?: string;
  resource: string;
  creation?: string;
  revoked?: boolean;
  revocation?: string;
  revocation_reason?: string;
  expired?: boolean;
  expiration?: string;
  scopes?: string[];
  user_id?: string;
  user?: OAuthConnectionUser;
}

export interface ListOAuthClientsResponse {
  clients: OAuthClient[];
}

export interface ListOAuthConnectionsResponse {
  connections: OAuthConnection[];
}

export interface BulkConnectionTarget {
  clientId: string;
  connectionId: string;
}

export interface BulkRevokeConnectionResult {
  clientId: string;
  connectionId: string;
  status: 'revoked' | 'error';
  statusCode?: number;
  message?: string;
}

export interface BulkRevokeConnectionsResponse {
  results: BulkRevokeConnectionResult[];
}

export interface BulkDeleteConnectionResult {
  clientId: string;
  connectionId: string;
  status: 'deleted' | 'error';
  statusCode?: number;
  message?: string;
}

export interface BulkDeleteConnectionsResponse {
  results: BulkDeleteConnectionResult[];
}

interface BulkConnectionsServerResponse<TStatus extends string> {
  results: Array<{
    client_id: string;
    connection_id: string;
    status: TStatus | 'error';
    status_code?: number;
    message?: string;
  }>;
}

const toBulkConnectionTargetPayload = (connections: BulkConnectionTarget[]) =>
  connections.map(({ clientId, connectionId }) => ({
    client_id: clientId,
    connection_id: connectionId,
  }));

const OAUTH_BASE_URL = '/internal/security/oauth';

export class ApplicationConnectionsAPIClient {
  constructor(private readonly http: HttpStart) {}

  public async listClients(): Promise<ListOAuthClientsResponse> {
    return await this.http.get<ListOAuthClientsResponse>(`${OAUTH_BASE_URL}/clients`);
  }

  public async listConnections(): Promise<ListOAuthConnectionsResponse> {
    return await this.http.get<ListOAuthConnectionsResponse>(`${OAUTH_BASE_URL}/connections`);
  }

  public async revokeClient(clientId: string, reason?: string): Promise<void> {
    await this.http.post(`${OAUTH_BASE_URL}/clients/${encodeURIComponent(clientId)}/_revoke`, {
      body: JSON.stringify({ reason }),
    });
  }

  public async revokeConnection(
    clientId: string,
    connectionId: string,
    reason?: string
  ): Promise<void> {
    await this.http.post(
      `${OAUTH_BASE_URL}/clients/${encodeURIComponent(clientId)}/connections/${encodeURIComponent(
        connectionId
      )}/_revoke`,
      {
        body: JSON.stringify({ reason }),
      }
    );
  }

  public async updateConnection(
    clientId: string,
    connectionId: string,
    body: { name: string }
  ): Promise<OAuthConnection> {
    return await this.http.patch<OAuthConnection>(
      `${OAUTH_BASE_URL}/clients/${encodeURIComponent(clientId)}/connections/${encodeURIComponent(
        connectionId
      )}`,
      {
        body: JSON.stringify(body),
      }
    );
  }

  public async bulkRevokeConnections(
    connections: BulkConnectionTarget[],
    reason?: string
  ): Promise<BulkRevokeConnectionsResponse> {
    const response = await this.http.post<BulkConnectionsServerResponse<'revoked'>>(
      `${OAUTH_BASE_URL}/connections/_bulk_revoke`,
      {
        body: JSON.stringify({
          connections: toBulkConnectionTargetPayload(connections),
          reason,
        }),
      }
    );

    return {
      results: response.results.map((item) => ({
        clientId: item.client_id,
        connectionId: item.connection_id,
        status: item.status,
        statusCode: item.status_code,
        message: item.message,
      })),
    };
  }

  public async bulkDeleteConnections(
    connections: BulkConnectionTarget[]
  ): Promise<BulkDeleteConnectionsResponse> {
    const response = await this.http.post<BulkConnectionsServerResponse<'deleted'>>(
      `${OAUTH_BASE_URL}/connections/_bulk_delete`,
      {
        body: JSON.stringify({
          connections: toBulkConnectionTargetPayload(connections),
        }),
      }
    );

    return {
      results: response.results.map((item) => ({
        clientId: item.client_id,
        connectionId: item.connection_id,
        status: item.status,
        statusCode: item.status_code,
        message: item.message,
      })),
    };
  }
}
