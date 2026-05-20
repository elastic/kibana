import type { SavedObjectsServiceSetup, SavedObjectsType } from '@kbn/core/server';
import type { EncryptedSavedObjectsPluginSetup } from '@kbn/encrypted-saved-objects-plugin/server';
export declare const getSavedObjectTypes: (options?: {
    useSpaceAwareness: boolean;
}) => {
    [key: string]: SavedObjectsType;
};
export declare function registerSavedObjects(savedObjects: SavedObjectsServiceSetup, options?: {
    useSpaceAwareness: boolean;
}): void;
export declare const OUTPUT_INCLUDE_AAD_FIELDS: Set<string>;
export declare const OUTPUT_ENCRYPTED_FIELDS: Set<{
    key: string;
}>;
export declare const FLEET_SERVER_HOST_ENCRYPTED_FIELDS: Set<{
    key: string;
}>;
export declare const DOWNLOAD_SOURCE_ENCRYPTED_FIELDS: Set<{
    key: string;
}>;
export declare function registerEncryptedSavedObjects(encryptedSavedObjects: EncryptedSavedObjectsPluginSetup): void;
