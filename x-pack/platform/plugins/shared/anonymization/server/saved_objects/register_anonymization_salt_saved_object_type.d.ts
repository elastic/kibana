import type { CoreSetup } from '@kbn/core/server';
import type { EncryptedSavedObjectsPluginSetup } from '@kbn/encrypted-saved-objects-plugin/server';
export declare const registerAnonymizationSaltSavedObjectType: (core: CoreSetup, encryptedSavedObjects: EncryptedSavedObjectsPluginSetup) => void;
