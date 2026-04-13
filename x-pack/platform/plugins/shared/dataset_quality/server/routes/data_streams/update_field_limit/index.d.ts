import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import type { UpdateFieldLimitResponse } from '../../../../common/api_types';
export declare function updateFieldLimit({ esClient, newFieldLimit, dataStream, }: {
    esClient: ElasticsearchClient;
    newFieldLimit: number;
    dataStream: string;
}): Promise<UpdateFieldLimitResponse>;
