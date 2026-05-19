import type { ElasticsearchClient, SavedObjectsClientContract } from '@kbn/core/server';
import type { SecondaryAuthorizationHeader } from '../../../../../common/types/models/transform_api_key';
import type { EsAssetReference } from '../../../../types';
export declare const stopTransforms: (transformIds: string[], esClient: ElasticsearchClient) => Promise<void>;
export declare const deleteTransforms: (esClient: ElasticsearchClient, transformIds: string[], deleteDestinationIndices?: boolean, secondaryAuth?: SecondaryAuthorizationHeader) => Promise<void>;
export declare const deleteTransformRefs: (savedObjectsClient: SavedObjectsClientContract, installedEsAssets: EsAssetReference[], pkgName: string, installedEsIdToRemove: string[], currentInstalledEsTransformIds: string[]) => Promise<import("@kbn/core/server").SavedObjectsUpdateResponse<{
    installed_es: EsAssetReference[];
}>>;
