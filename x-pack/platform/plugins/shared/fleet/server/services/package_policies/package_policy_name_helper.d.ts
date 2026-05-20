import type { SavedObjectsClientContract } from '@kbn/core/server';
export declare function incrementPackageName(soClient: SavedObjectsClientContract, packageName: string, spaceIds: string[]): Promise<string>;
export declare function incrementPackagePolicyCopyName(soClient: SavedObjectsClientContract, packagePolicyName: string): Promise<string>;
