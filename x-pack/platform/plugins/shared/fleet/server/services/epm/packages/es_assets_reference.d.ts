import type { SavedObjectsClientContract } from '@kbn/core/server';
import type { EsAssetReference } from '../../../types';
/**
 * Utility function for updating the installed_es field of a package
 */
export declare const updateEsAssetReferences: (savedObjectsClient: SavedObjectsClientContract, pkgName: string, currentAssets: EsAssetReference[], { assetsToAdd, assetsToRemove, refresh, }: {
    assetsToAdd?: EsAssetReference[];
    assetsToRemove?: EsAssetReference[];
    /**
     * Whether or not the update should force a refresh on the SO index.
     * Defaults to `false` for faster updates, should only be `wait_for` if the update needs to be queried back from ES
     * immediately.
     */
    refresh?: "wait_for" | false;
}) => Promise<EsAssetReference[]>;
/**
 * Utility function for adding assets the installed_es field of a package
 * uses optimistic concurrency control to prevent missed updates
 */
export declare const optimisticallyAddEsAssetReferences: (savedObjectsClient: SavedObjectsClientContract, pkgName: string, assetsToAdd: EsAssetReference[], esIndexPatterns?: Record<string, string>) => Promise<EsAssetReference[]>;
