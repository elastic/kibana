import type { ElasticsearchClient, Logger } from '@kbn/core/server';
export declare const createClusterDataCheck: () => (esClient: ElasticsearchClient, log: Logger) => Promise<boolean>;
