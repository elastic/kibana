import type { SavedObjectsClientContract } from '@kbn/core/server';
export declare function removeOldAssets(options: {
    soClient: SavedObjectsClientContract;
    pkgName: string;
    currentVersion: string;
}): Promise<void>;
