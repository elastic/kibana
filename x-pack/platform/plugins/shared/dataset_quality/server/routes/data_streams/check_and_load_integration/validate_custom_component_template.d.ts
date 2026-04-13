import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
export declare function validateCustomComponentTemplate({ esClient, indexTemplateName, }: {
    esClient: ElasticsearchClient;
    indexTemplateName: string;
}): Promise<boolean>;
