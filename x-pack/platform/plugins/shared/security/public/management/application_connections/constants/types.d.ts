import type { OAuthClient, OAuthConnection, OAuthConnectionUser } from '../service/application_connections_api_client';
export interface ApplicationConnections {
    client: OAuthClient;
    connections: OAuthConnection[];
}
export interface ApplicationConnection {
    client: OAuthClient;
    connection: OAuthConnection;
}
export type ApplicationConnectionStatusFilter = 'connected' | 'expired' | 'revoked';
export type ApplicationConnectionsViewMode = 'grouped' | 'list';
export type ApplicationConnectionsEntityKind = 'application' | 'connection';
export interface RevokeApplicationConnectionsModalConnection {
    connectionId: string;
    connectionName?: string;
    userId?: string;
    user?: OAuthConnectionUser;
    client: OAuthClient;
}
export interface RevokedApplicationConnection {
    clientId: string;
    connectionId: string;
}
