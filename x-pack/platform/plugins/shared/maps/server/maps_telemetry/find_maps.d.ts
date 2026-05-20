import type { ISavedObjectsRepository, SavedObject } from '@kbn/core/server';
import type { StoredMapAttributes } from '..';
export declare function findMaps(savedObjectsClient: Pick<ISavedObjectsRepository, 'find'>, callback: (savedObject: SavedObject<StoredMapAttributes>) => void): Promise<void>;
