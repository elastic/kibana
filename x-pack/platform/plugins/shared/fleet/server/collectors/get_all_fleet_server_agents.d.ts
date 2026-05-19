import type { SavedObjectsClientContract, ElasticsearchClient } from '@kbn/core/server';
export declare const getAllFleetServerAgents: (soClient: SavedObjectsClientContract, esClient: ElasticsearchClient) => Promise<import("../../common").Agent[]>;
