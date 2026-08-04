import type { OAuthClient, OAuthClientLogo, OAuthClientType } from '@kbn/agent-builder-common';
export interface ListOAuthClientsResponse {
    clients: OAuthClient[];
}
export interface CreateOAuthClientPayload {
    client_name: string;
    client_type?: OAuthClientType;
    client_metadata?: Record<string, string>;
    client_logo?: OAuthClientLogo;
    redirect_uris?: string[];
}
export interface CreateOAuthClientResponse extends OAuthClient {
    client_secret?: string;
}
export type GetOAuthClientResponse = OAuthClient;
export interface RevokeOAuthClientPayload {
    reason?: string;
}
export interface RevokeOAuthClientResponse {
    acknowledged: boolean;
}
