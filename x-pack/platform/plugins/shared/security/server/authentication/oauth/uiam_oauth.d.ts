import type { KibanaRequest, Logger } from '@kbn/core/server';
import type { CreateUiamOAuthClientParams, UiamOAuthClientResponse, UiamOAuthConnectionResponse, UiamOAuthType, UpdateUiamOAuthClientParams, UpdateUiamOAuthConnectionParams } from '@kbn/core-security-server';
import type { SecurityLicense } from '../../../common';
import type { UiamServicePublic } from '../../uiam';
export interface UiamOAuthOptions {
    logger: Logger;
    license: SecurityLicense;
    uiam: UiamServicePublic;
}
export declare class UiamOAuth implements UiamOAuthType {
    private readonly logger;
    private readonly license;
    private readonly uiam;
    constructor({ logger, license, uiam }: UiamOAuthOptions);
    createClient(request: KibanaRequest, params: CreateUiamOAuthClientParams): Promise<UiamOAuthClientResponse | null>;
    listClients(request: KibanaRequest, clientId?: string): Promise<{
        clients: UiamOAuthClientResponse[];
    } | null>;
    updateClient(request: KibanaRequest, clientId: string, params: UpdateUiamOAuthClientParams): Promise<UiamOAuthClientResponse | null>;
    revokeClient(request: KibanaRequest, clientId: string, reason?: string): Promise<UiamOAuthClientResponse | null>;
    listConnections(request: KibanaRequest, clientId?: string, connectionId?: string): Promise<{
        connections: UiamOAuthConnectionResponse[];
    } | null>;
    updateConnection(request: KibanaRequest, clientId: string, connectionId: string, params: UpdateUiamOAuthConnectionParams): Promise<UiamOAuthConnectionResponse | null>;
    revokeConnection(request: KibanaRequest, clientId: string, connectionId: string, reason?: string): Promise<UiamOAuthConnectionResponse | null>;
    /**
     * Extracts the Bearer access token from the request. The token must be a UIAM credential.
     */
    static getAccessToken(request: KibanaRequest): string;
}
