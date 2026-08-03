import type { OAuthClient } from '@kbn/agent-builder-common';
import type { HttpStart } from '@kbn/core/public';
export type { OAuthClient, OAuthClientLogo, OAuthClientConnectionsSummary, } from '@kbn/agent-builder-common';
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
export declare class ApplicationConnectionsAPIClient {
    private readonly http;
    constructor(http: HttpStart);
    listClients(): Promise<ListOAuthClientsResponse>;
    listConnections(): Promise<ListOAuthConnectionsResponse>;
    revokeClient(clientId: string, reason?: string): Promise<void>;
    revokeConnection(clientId: string, connectionId: string, reason?: string): Promise<void>;
    updateConnection(clientId: string, connectionId: string, body: {
        name: string;
    }): Promise<OAuthConnection>;
    bulkRevokeConnections(connections: BulkRevokeConnectionTarget[], reason?: string): Promise<BulkRevokeConnectionsResponse>;
}
