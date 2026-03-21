import type { EncryptedSavedObjectsClient } from '@kbn/encrypted-saved-objects-plugin/server';
import type { Logger, SavedObjectsClientContract } from '@kbn/core/server';
import type { ConnectorToken } from '../types';
export declare const MAX_TOKENS_RETURNED = 1;
interface ConstructorOptions {
    encryptedSavedObjectsClient: EncryptedSavedObjectsClient;
    unsecuredSavedObjectsClient: SavedObjectsClientContract;
    logger: Logger;
}
interface CreateOptions {
    connectorId: string;
    token: string;
    expiresAtMillis?: string;
    tokenType?: string;
}
export interface UpdateOptions {
    id: string;
    token: string;
    expiresAtMillis?: string;
    tokenType?: string;
}
interface UpdateOrReplaceOptions {
    connectorId: string;
    token: ConnectorToken | null;
    newToken: string;
    expiresInSec?: number;
    tokenRequestDate: number;
    deleteExisting: boolean;
}
export declare class SharedConnectorTokenClient {
    private readonly logger;
    private readonly unsecuredSavedObjectsClient;
    private readonly encryptedSavedObjectsClient;
    constructor({ unsecuredSavedObjectsClient, encryptedSavedObjectsClient, logger, }: ConstructorOptions);
    private formatTokenId;
    private parseTokenId;
    /**
     * Create new token for connector
     */
    create({ connectorId, token, expiresAtMillis, tokenType, }: CreateOptions): Promise<ConnectorToken>;
    /**
     * Update connector token
     */
    update({ id, token, expiresAtMillis, tokenType, }: UpdateOptions): Promise<ConnectorToken | null>;
    /**
     * Get connector token
     */
    get({ connectorId, tokenType, }: {
        connectorId: string;
        tokenType?: string;
    }): Promise<{
        hasErrors: boolean;
        connectorToken: ConnectorToken | null;
    }>;
    /**
     * Delete all connector tokens
     */
    deleteConnectorTokens({ connectorId, tokenType, }: {
        connectorId: string;
        tokenType?: string;
    }): Promise<void>;
    updateOrReplace({ connectorId, token, newToken, expiresInSec, tokenRequestDate, deleteExisting, }: UpdateOrReplaceOptions): Promise<void>;
    /**
     * Create new token with refresh token support
     */
    createWithRefreshToken({ connectorId, accessToken, refreshToken, expiresIn, refreshTokenExpiresIn, tokenType, }: {
        connectorId: string;
        accessToken: string;
        refreshToken?: string;
        expiresIn?: number;
        refreshTokenExpiresIn?: number;
        tokenType?: string;
    }): Promise<ConnectorToken>;
    /**
     * Update token with refresh token
     */
    updateWithRefreshToken({ id, token, refreshToken, expiresIn, refreshTokenExpiresIn, tokenType, }: {
        id: string;
        token: string;
        refreshToken?: string;
        expiresIn?: number;
        refreshTokenExpiresIn?: number;
        tokenType?: string;
    }): Promise<ConnectorToken | null>;
}
export {};
