import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
export declare function hasKbWriteIndex({ esClient, }: {
    esClient: {
        asInternalUser: ElasticsearchClient;
    };
}): Promise<boolean>;
