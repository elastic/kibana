import type { SavedObjectMigrationMap } from '@kbn/core/server';
import type { EncryptedSavedObjectsPluginSetup } from '@kbn/encrypted-saved-objects-plugin/server';
export declare function getActionsMigrations(encryptedSavedObjects: EncryptedSavedObjectsPluginSetup): SavedObjectMigrationMap;
