import type { SavedObjectsServiceStart, Logger } from '@kbn/core/server';
import type { EncryptedSavedObjectsPluginStart } from '@kbn/encrypted-saved-objects-plugin/server';
export declare const ANONYMIZATION_SALT_SAVED_OBJECT_TYPE = "anonymization-salt";
/**
 * Service for managing per-space encrypted salt material used for
 * deterministic tokenization. The salt is stored as an encrypted saved
 * object and is never exposed to client-side code.
 */
export declare class SaltService {
    private readonly savedObjects;
    private readonly encryptedSavedObjects;
    private readonly logger;
    constructor(savedObjects: SavedObjectsServiceStart, encryptedSavedObjects: EncryptedSavedObjectsPluginStart, logger: Logger);
    /**
     * Gets the per-space salt, creating it if it doesn't exist.
     * The salt is stored as an encrypted saved object keyed by a deterministic UUID per namespace.
     */
    getSalt(namespace: string): Promise<string>;
    /**
     * Gets the per-space replacements encryption key, creating it if it doesn't exist.
     * Stored with the same hidden encrypted SO as salt material.
     */
    getReplacementsEncryptionKey(namespace: string): Promise<string>;
    private getOrCreateKeyMaterial;
    /**
     * Creates a new per-space salt. Idempotent: if a concurrent create
     * produced a conflict, reads and returns the existing salt.
     */
    private createKeyMaterial;
    /**
     * @returns `true` if the update was persisted, `false` on 409 version conflict.
     */
    private updateKeyMaterial;
}
