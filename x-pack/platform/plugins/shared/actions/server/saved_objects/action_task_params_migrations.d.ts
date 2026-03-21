import type { SavedObjectMigrationMap, SavedObjectUnsanitizedDoc } from '@kbn/core/server';
import type { EncryptedSavedObjectsPluginSetup } from '@kbn/encrypted-saved-objects-plugin/server';
import type { ActionTaskParams, InMemoryConnector } from '../types';
export declare function getActionTaskParamsMigrations(encryptedSavedObjects: EncryptedSavedObjectsPluginSetup, inMemoryConnectors: InMemoryConnector[]): SavedObjectMigrationMap;
export declare function isInMemoryAction(doc: SavedObjectUnsanitizedDoc<ActionTaskParams>, inMemoryConnectors: InMemoryConnector[]): boolean;
