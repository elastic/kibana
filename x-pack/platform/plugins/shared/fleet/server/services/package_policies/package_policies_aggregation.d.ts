import type { SavedObjectsClientContract } from '@kbn/core/server';
export declare function getPackagePoliciesCountByPackageName(soClient: SavedObjectsClientContract): Promise<{
    [k: string]: number;
}>;
