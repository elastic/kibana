import type { ElasticsearchClient } from '@kbn/core/server';
export declare const CLUSTER_PRIVILEGES: string[];
export declare const INDEX_PRIVILEGES: {
    names: string[];
    privileges: string[];
};
export declare function canCreateStandaloneAgentApiKey(esClient: ElasticsearchClient): Promise<boolean>;
export declare function createStandaloneAgentApiKey(esClient: ElasticsearchClient, name: string): Promise<import("@elastic/elasticsearch/lib/api/types").SecurityCreateApiKeyResponse>;
