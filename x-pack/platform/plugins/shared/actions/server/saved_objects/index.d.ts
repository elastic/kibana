import type { SavedObjectsServiceSetup } from '@kbn/core/server';
import type { EncryptedSavedObjectsPluginSetup } from '@kbn/encrypted-saved-objects-plugin/server';
import type { InMemoryConnector } from '../types';
import type { ActionTypeRegistry } from '../action_type_registry';
export declare function setupSavedObjects(savedObjects: SavedObjectsServiceSetup, encryptedSavedObjects: EncryptedSavedObjectsPluginSetup, actionTypeRegistry: ActionTypeRegistry, taskManagerIndex: string, inMemoryConnectors: InMemoryConnector[]): void;
