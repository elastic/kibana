import type { SavedObjectsClientContract, ISavedObjectTypeRegistry } from '@kbn/core/server';
import type { AssetSOObject, SimpleSOAssetType } from '../../../../common';
export declare function getBulkAssets(soClient: SavedObjectsClientContract, soTypeRegistry: ISavedObjectTypeRegistry, assetIds: AssetSOObject[]): Promise<SimpleSOAssetType[]>;
