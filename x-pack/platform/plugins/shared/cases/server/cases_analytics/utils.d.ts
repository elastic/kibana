import type { SavedObjectsClientContract } from '@kbn/core/server';
export declare function getAllSpacesWithCases(savedObjectsClient: SavedObjectsClientContract): Promise<string[]>;
