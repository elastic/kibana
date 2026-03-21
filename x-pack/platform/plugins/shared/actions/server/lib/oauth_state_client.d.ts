import type { EncryptedSavedObjectsClient } from '@kbn/encrypted-saved-objects-plugin/server';
import type { Logger, SavedObjectsClientContract } from '@kbn/core/server';
interface OAuthStateAttributes {
    state: string;
    codeVerifier: string;
    connectorId: string;
    kibanaReturnUrl?: string;
    spaceId: string;
    createdAt: string;
    expiresAt: string;
    createdBy?: string;
}
export interface OAuthState extends OAuthStateAttributes {
    id: string;
}
interface ConstructorOptions {
    encryptedSavedObjectsClient: EncryptedSavedObjectsClient;
    unsecuredSavedObjectsClient: SavedObjectsClientContract;
    logger: Logger;
}
interface CreateStateOptions {
    connectorId: string;
    kibanaReturnUrl?: string;
    spaceId: string;
    createdBy?: string;
}
export declare class OAuthStateClient {
    private readonly logger;
    private readonly unsecuredSavedObjectsClient;
    private readonly encryptedSavedObjectsClient;
    constructor({ unsecuredSavedObjectsClient, encryptedSavedObjectsClient, logger, }: ConstructorOptions);
    /**
     * Create new OAuth state with PKCE parameters
     */
    create({ connectorId, kibanaReturnUrl, spaceId, createdBy, }: CreateStateOptions): Promise<{
        state: OAuthState;
        codeChallenge: string;
    }>;
    /**
     * Get and validate OAuth state by state parameter
     */
    get(stateParam: string): Promise<OAuthState | null>;
    /**
     * Delete OAuth state (should be called after a successful token exchange)
     */
    delete(id: string): Promise<void>;
    /**
     * Clean up expired OAuth states (called periodically by task manager)
     */
    cleanupExpiredStates(): Promise<number>;
}
export {};
