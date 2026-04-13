import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import type { DataStreamSettings } from '../../../../common/api_types';
export declare function getDataStreamSettings({ esClient, dataStream, }: {
    esClient: ElasticsearchClient;
    dataStream: string;
}): Promise<DataStreamSettings>;
