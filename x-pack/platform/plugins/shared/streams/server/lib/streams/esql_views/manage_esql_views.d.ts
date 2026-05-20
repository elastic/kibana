import type { ElasticsearchClient, Logger } from '@kbn/core/server';
export interface EsqlView {
    name: string;
    query: string;
}
export interface EsqlViewResponse {
    views: EsqlView[];
}
export declare function getEsqlView({ esClient, logger, name, }: {
    esClient: ElasticsearchClient;
    logger: Logger;
    name: string;
}): Promise<EsqlView>;
export declare function upsertEsqlView({ esClient, logger, name, query, }: {
    esClient: ElasticsearchClient;
    logger: Logger;
    name: string;
    query: string;
}): Promise<void>;
export declare function deleteEsqlView({ esClient, logger, name, }: {
    esClient: ElasticsearchClient;
    logger: Logger;
    name: string;
}): Promise<void>;
