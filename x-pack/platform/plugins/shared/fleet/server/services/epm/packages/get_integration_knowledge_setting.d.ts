import type { SavedObjectsClientContract } from '@kbn/core/server';
export declare function getIntegrationKnowledgeSetting(savedObjectsClient: SavedObjectsClientContract): Promise<boolean>;
