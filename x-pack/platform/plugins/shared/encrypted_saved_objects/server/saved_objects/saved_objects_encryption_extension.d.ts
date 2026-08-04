import type { EncryptedObjectDescriptor, ISavedObjectsEncryptionExtension, ISavedObjectTypeRegistry, SavedObject } from '@kbn/core-saved-objects-server';
import type { AuthenticatedUser } from '@kbn/security-plugin/common';
import type { EncryptedSavedObjectsService } from '../crypto';
/**
 * @internal Only exported for unit testing.
 */
export interface Params {
    baseTypeRegistry: ISavedObjectTypeRegistry;
    service: Readonly<EncryptedSavedObjectsService>;
    getCurrentUser: () => Promise<AuthenticatedUser | undefined>;
}
export declare class SavedObjectsEncryptionExtension implements ISavedObjectsEncryptionExtension {
    readonly _baseTypeRegistry: ISavedObjectTypeRegistry;
    readonly _service: Readonly<EncryptedSavedObjectsService>;
    readonly _getCurrentUser: () => Promise<AuthenticatedUser | undefined>;
    constructor({ baseTypeRegistry, service, getCurrentUser }: Params);
    isEncryptableType(type: string): boolean;
    shouldEnforceRandomId(type: string): boolean;
    decryptOrStripResponseAttributes<T, R extends SavedObject<T>>(response: R, originalAttributes?: T): Promise<R>;
    getEncryptedAttributes(type: string): ReadonlySet<string> | undefined;
    encryptAttributes<T extends Record<string, unknown>>(descriptor: EncryptedObjectDescriptor, attributes: T): Promise<T>;
}
