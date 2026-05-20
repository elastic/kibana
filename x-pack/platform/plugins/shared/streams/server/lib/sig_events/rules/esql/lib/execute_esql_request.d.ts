import type { estypes } from '@elastic/elasticsearch';
import type { ElasticsearchClient, Logger } from '@kbn/core/server';
type Response = Array<{
    _id: string;
    _source: Record<string, unknown>;
}>;
export declare const executeEsqlRequest: ({ esClient, esqlRequest, logger, }: {
    esClient: ElasticsearchClient;
    esqlRequest: {
        query: string;
        filter: estypes.QueryDslQueryContainer;
    };
    logger: Logger;
}) => Promise<Response>;
export {};
