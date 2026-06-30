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

export interface OAuthConnection {
  id: string;
  client_id: string;
  name?: string;
  resource: string;
  creation?: string;
  revoked?: boolean;
  revocation?: string;
  revocation_reason?: string;
  scopes?: string[];
  user_id?: string;
}

export interface ListOAuthClientsResponse {
  clients: OAuthClient[];
}

export interface ListOAuthConnectionsResponse {
  connections: OAuthConnection[];
}

export interface BulkRevokeConnectionTarget {
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

interface BulkRevokeConnectionsServerResponse {
  results: Array<{
    client_id: string;
    connection_id: string;
    status: 'revoked' | 'error';
    status_code?: number;
    message?: string;
  }>;
}

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
    connections: BulkRevokeConnectionTarget[],
    reason?: string
  ): Promise<BulkRevokeConnectionsResponse> {
    const response = await this.http.post<BulkRevokeConnectionsServerResponse>(
      `${OAUTH_BASE_URL}/connections/_bulk_revoke`,
      {
        body: JSON.stringify({
          connections: connections.map(({ clientId, connectionId }) => ({
            client_id: clientId,
            connection_id: connectionId,
          })),
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
}
