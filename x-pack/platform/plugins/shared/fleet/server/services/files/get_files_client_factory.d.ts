import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import type { LoggerFactory } from '@kbn/core/server';
import type { FilesClientFactory } from './types';
interface GetFilesClientFactoryParams {
    esClient: ElasticsearchClient;
    logger: LoggerFactory;
}
export declare const getFilesClientFactory: ({ esClient, logger, }: GetFilesClientFactoryParams) => FilesClientFactory;
export {};
