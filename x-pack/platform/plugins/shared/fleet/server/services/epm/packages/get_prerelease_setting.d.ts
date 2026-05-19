import type { SavedObjectsClientContract } from '@kbn/core/server';
export declare function getPrereleaseFromSettings(savedObjectsClient: SavedObjectsClientContract): Promise<boolean>;
