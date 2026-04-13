import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import type { DegradedFieldResponse } from '../../../../common/api_types';
export declare function getDegradedFields({ esClient, start, end, dataStream, }: {
    esClient: ElasticsearchClient;
    start: number;
    end: number;
    dataStream: string;
}): Promise<DegradedFieldResponse>;
