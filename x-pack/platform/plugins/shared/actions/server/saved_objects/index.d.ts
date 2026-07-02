import type { SavedObjectsServiceSetup, ISavedObjectsRepository } from '@kbn/core/server';
import type { EncryptedSavedObjectsPluginSetup } from '@kbn/encrypted-saved-objects-plugin/server';
import type { InMemoryConnector } from '../types';
import type { ActionTypeRegistry } from '../action_type_registry';
export declare function setupSavedObjects(savedObjects: SavedObjectsServiceSetup, encryptedSavedObjects: EncryptedSavedObjectsPluginSetup, actionTypeRegistry: ActionTypeRegistry, taskManagerIndex: string, inMemoryConnectors: InMemoryConnector[], getSoRepository: () => Promise<ISavedObjectsRepository | undefined> | ISavedObjectsRepository | undefined): void;
