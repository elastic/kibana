import type { SavedObjectsModelVersion } from '@kbn/core-saved-objects-server';
import type { EncryptedSavedObjectsService, EncryptedSavedObjectTypeRegistration } from './crypto';
export interface CreateEsoModelVersionFnOpts {
    modelVersion: SavedObjectsModelVersion;
    shouldTransformIfDecryptionFails?: boolean;
    inputType: EncryptedSavedObjectTypeRegistration;
    outputType: EncryptedSavedObjectTypeRegistration;
}
export type CreateEsoModelVersionFn = (opts: CreateEsoModelVersionFnOpts) => SavedObjectsModelVersion;
export declare const getCreateEsoModelVersion: (encryptedSavedObjectsService: Readonly<EncryptedSavedObjectsService>, instantiateServiceWithLegacyType: (typeRegistration: EncryptedSavedObjectTypeRegistration) => EncryptedSavedObjectsService) => CreateEsoModelVersionFn;
