import type { EncryptedSavedObjectsClient } from '@kbn/encrypted-saved-objects-plugin/server';
import type { Logger, SavedObjectsClientContract, SavedObjectAttributes } from '@kbn/core/server';
import type { ConnectorToken, UserConnectorToken } from '../types';
export declare const MAX_TOKENS_RETURNED = 1;
declare const PER_USER_TOKEN_SCOPE: "per-user";
declare const SHARED_TOKEN_SCOPE: "shared";
interface ConstructorOptions {
    encryptedSavedObjectsClient: EncryptedSavedObjectsClient;
    unsecuredSavedObjectsClient: SavedObjectsClientContract;
    logger: Logger;
}
export interface UpdateOptions {
    id: string;
    token?: string;
    credentials?: SavedObjectAttributes;
    expiresAtMillis?: string;
    tokenType?: string;
    credentialType?: string;
}
interface UpdateOrReplaceOptions {
    profileUid?: string;
    connectorId: string;
    token: ConnectorToken | UserConnectorToken | null;
    newToken: string;
    expiresInSec?: number;
    tokenRequestDate: number;
    deleteExisting: boolean;
}
export declare class ConnectorTokenClient {
    private readonly logger;
    private readonly sharedClient;
    private readonly userClient;
    constructor(options: ConstructorOptions);
    private getScope;
    private parseTokenId;
    private log;
    /**
     * Create new token for connector (delegates to shared or user client)
     */
    create(options: {
        connectorId: string;
        token: string;
        expiresAtMillis?: string;
        tokenType?: string;
    }): Promise<ConnectorToken>;
    create(options: {
        profileUid: string;
        connectorId: string;
        token?: string;
        credentials?: SavedObjectAttributes;
        expiresAtMillis?: string;
        tokenType?: string;
        credentialType?: string;
    }): Promise<UserConnectorToken>;
    /**
     * Update connector token (delegates based on id prefix)
     */
    update(options: UpdateOptions): Promise<ConnectorToken | UserConnectorToken | null>;
    /**
     * Get connector token (delegates to shared or user client)
     */
    get(options: {
        connectorId: string;
        tokenType?: string;
        credentialType?: string;
    }): Promise<{
        hasErrors: boolean;
        connectorToken: ConnectorToken | null;
    }>;
    get(options: {
        profileUid: string;
        connectorId: string;
        tokenType?: string;
        credentialType?: string;
    }): Promise<{
        hasErrors: boolean;
        connectorToken: UserConnectorToken | null;
    }>;
    get(options: {
        profileUid?: string;
        connectorId: string;
        tokenType?: string;
        credentialType?: string;
    }): Promise<{
        hasErrors: boolean;
        connectorToken: ConnectorToken | UserConnectorToken | null;
    }>;
    /**
     * Delete all connector tokens (delegates to shared or user client)
     */
    deleteConnectorTokens(options: {
        profileUid?: string;
        connectorId: string;
        tokenType?: string;
        credentialType?: string;
        authMode?: typeof PER_USER_TOKEN_SCOPE | typeof SHARED_TOKEN_SCOPE;
    }): Promise<void>;
    updateOrReplace(options: UpdateOrReplaceOptions): Promise<void>;
    /**
     * Create new token with refresh token support (delegates to shared or user client)
     */
    createWithRefreshToken(options: {
        profileUid?: string;
        connectorId: string;
        accessToken: string;
        refreshToken?: string;
        expiresIn?: number;
        refreshTokenExpiresIn?: number;
        tokenType?: string;
        credentialType?: string;
    }): Promise<ConnectorToken | UserConnectorToken>;
    /**
     * Update token with refresh token (delegates based on id prefix)
     */
    updateWithRefreshToken(options: {
        id: string;
        token: string;
        refreshToken?: string;
        expiresIn?: number;
        refreshTokenExpiresIn?: number;
        tokenType?: string;
        credentialType?: string;
    }): Promise<ConnectorToken | UserConnectorToken | null>;
}
export {};
