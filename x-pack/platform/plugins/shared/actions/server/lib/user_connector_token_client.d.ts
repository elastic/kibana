import type { EncryptedSavedObjectsClient } from '@kbn/encrypted-saved-objects-plugin/server';
import type { Logger, SavedObjectsClientContract, SavedObjectAttributes } from '@kbn/core/server';
import type { UserConnectorToken, UserConnectorOAuthToken } from '../types';
export declare const MAX_TOKENS_RETURNED = 1;
interface ConstructorOptions {
    encryptedSavedObjectsClient: EncryptedSavedObjectsClient;
    unsecuredSavedObjectsClient: SavedObjectsClientContract;
    logger: Logger;
}
interface CreateOptions {
    profileUid: string;
    connectorId: string;
    token?: string;
    credentials?: SavedObjectAttributes;
    expiresAtMillis?: string;
    tokenType?: string;
    credentialType?: string;
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
    profileUid: string;
    connectorId: string;
    token: UserConnectorToken | null;
    newToken: string;
    expiresInSec?: number;
    tokenRequestDate: number;
    deleteExisting: boolean;
}
export declare class UserConnectorTokenClient {
    private readonly logger;
    private readonly unsecuredSavedObjectsClient;
    private readonly encryptedSavedObjectsClient;
    constructor({ unsecuredSavedObjectsClient, encryptedSavedObjectsClient, logger, }: ConstructorOptions);
    private parseTokenId;
    private formatTokenId;
    private getContextString;
    private parseOAuthPerUserCredentials;
    /**
     * Create new per-user token for connector
     */
    create({ profileUid, connectorId, token, credentials, expiresAtMillis, tokenType, credentialType, }: CreateOptions): Promise<UserConnectorToken>;
    /**
     * Update per-user connector token
     */
    update({ id, token, credentials, expiresAtMillis, tokenType, credentialType, }: UpdateOptions): Promise<UserConnectorToken | null>;
    /**
     * Get per-user connector token
     */
    get({ profileUid, connectorId, tokenType, credentialType, }: {
        profileUid: string;
        connectorId: string;
        tokenType?: string;
        credentialType?: string;
    }): Promise<{
        hasErrors: boolean;
        connectorToken: UserConnectorToken | null;
    }>;
    /**
     * Get OAuth per-user token with parsed credentials
     */
    getOAuthPersonalToken({ profileUid, connectorId, }: {
        profileUid: string;
        connectorId: string;
    }): Promise<{
        hasErrors: boolean;
        connectorToken: UserConnectorOAuthToken | null;
    }>;
    /**
     * Delete all per-user connector tokens
     */
    deleteConnectorTokens({ profileUid, connectorId, tokenType, credentialType, }: {
        profileUid: string;
        connectorId: string;
        tokenType?: string;
        credentialType?: string;
    }): Promise<void>;
    updateOrReplace({ profileUid, connectorId, token, newToken, expiresInSec, tokenRequestDate, deleteExisting, }: UpdateOrReplaceOptions): Promise<void>;
    /**
     * Create new per-user token with refresh token support
     */
    createWithRefreshToken({ profileUid, connectorId, accessToken, refreshToken, expiresIn, refreshTokenExpiresIn, tokenType, credentialType, }: {
        profileUid: string;
        connectorId: string;
        accessToken: string;
        refreshToken?: string;
        expiresIn?: number;
        refreshTokenExpiresIn?: number;
        tokenType?: string;
        credentialType?: string;
    }): Promise<UserConnectorToken>;
    /**
     * Update per-user token with refresh token
     */
    updateWithRefreshToken({ id, token, refreshToken, expiresIn, refreshTokenExpiresIn, tokenType, credentialType, }: {
        id: string;
        token: string;
        refreshToken?: string;
        expiresIn?: number;
        refreshTokenExpiresIn?: number;
        tokenType?: string;
        credentialType?: string;
    }): Promise<UserConnectorToken | null>;
}
export {};
