import type { ElasticsearchClient, SavedObjectsClientContract } from '@kbn/core/server';
export declare function isSSLSecretStorageEnabled(esClient: ElasticsearchClient, soClient: SavedObjectsClientContract): Promise<boolean>;
