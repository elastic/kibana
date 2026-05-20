import type { ElasticsearchClient, SavedObjectsClientContract } from '@kbn/core/server';
import type { EsAssetReference } from '../../../../../common/types';
export declare const deletePreviousPipelines: (esClient: ElasticsearchClient, savedObjectsClient: SavedObjectsClientContract, pkgName: string, previousPkgVersion: string, esReferences: EsAssetReference[]) => Promise<EsAssetReference[]>;
export declare function deletePipeline(esClient: ElasticsearchClient, id: string): Promise<void>;
