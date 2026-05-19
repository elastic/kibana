import type { KibanaRequest, Logger, StartServicesAccessor } from '@kbn/core/server';
import type { PublicMethodsOf } from '@kbn/utility-types';
import type { EncryptedSavedObjectsService } from './encrypted_saved_objects_service';
interface EncryptionKeyRotationServiceOptions {
    logger: Logger;
    service: PublicMethodsOf<EncryptedSavedObjectsService>;
    getStartServices: StartServicesAccessor;
}
interface EncryptionKeyRotationParams {
    /**
     * The maximum number of the objects we fetch and process in one iteration.
     */
    batchSize: number;
    /**
     * Optionally allows to limit key rotation to only specified Saved Object type.
     */
    type?: string;
}
interface EncryptionKeyRotationResult {
    /**
     * The total number of the Saved Objects encrypted by the Encrypted Saved Objects plugin.
     */
    total: number;
    /**
     * The number of the Saved Objects that were still encrypted with one of the secondary encryption
     * keys and were successfully re-encrypted with the primary key.
     */
    successful: number;
    /**
     * The number of the Saved Objects that were still encrypted with one of the secondary encryption
     * keys that we failed to re-encrypt with the primary key.
     */
    failed: number;
}
/**
 * Service that deals with encryption key rotation matters.
 */
export declare class EncryptionKeyRotationService {
    private readonly options;
    constructor(options: EncryptionKeyRotationServiceOptions);
    rotate(request: KibanaRequest, { batchSize, type }: EncryptionKeyRotationParams): Promise<EncryptionKeyRotationResult>;
    /**
     * Takes a list of Saved Objects and tries to decrypt their attributes with the secondary encryption
     * keys, silently skipping those that cannot be decrypted. The objects that were decrypted with the
     * decryption-only keys will be returned and grouped by the namespace.
     * @param savedObjects Saved Objects to decrypt attributes for.
     * @param processedObjectIDs Set of Saved Object IDs that were already processed.
     * @param typeRegistry Saved Objects type registry.
     * @param user The user that initiated decryption.
     */
    private getSavedObjectsToReEncrypt;
}
export {};
