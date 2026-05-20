import type { ElasticsearchClient, Logger } from '@kbn/core/server';
/**
 * In 8.10 upload feature moved from using index to datastreams, this function allows to clean those old indices.
 */
export declare function cleanUpOldFileIndices(esClient: ElasticsearchClient, logger: Logger): Promise<void>;
