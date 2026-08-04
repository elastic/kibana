import type { SavedObjectsModelVersionMap } from '@kbn/core-saved-objects-server';
import type { EncryptedSavedObjectsPluginSetup } from '@kbn/encrypted-saved-objects-plugin/server';
export declare const connectorTokenModelVersions: (encryptedSavedObjects: EncryptedSavedObjectsPluginSetup) => SavedObjectsModelVersionMap;
