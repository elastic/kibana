import type { ElasticsearchClient } from '@kbn/core/server';
export declare function addIndexWriteBlock({ esClient, index, }: {
    esClient: {
        asInternalUser: ElasticsearchClient;
    };
    index: string;
}): Promise<void>;
export declare function removeIndexWriteBlock({ esClient, index, }: {
    esClient: {
        asInternalUser: ElasticsearchClient;
    };
    index: string;
}): Promise<import("@elastic/elasticsearch/lib/api/types").AcknowledgedResponseBase>;
export declare function isKnowledgeBaseIndexWriteBlocked(error: any): boolean;
