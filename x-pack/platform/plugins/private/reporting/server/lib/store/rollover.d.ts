import type { ElasticsearchClient, Logger } from '@kbn/core/server';
export declare function rollDataStreamIfRequired(logger: Logger, esClient: ElasticsearchClient): Promise<boolean>;
