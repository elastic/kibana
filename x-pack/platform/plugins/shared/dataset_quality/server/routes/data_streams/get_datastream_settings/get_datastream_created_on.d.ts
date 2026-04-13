import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
export declare function getDataStreamCreatedOn(esClient: ElasticsearchClient, dataStream: string): Promise<number>;
