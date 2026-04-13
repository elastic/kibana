import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import type { DegradedFieldValues } from '../../../../common/api_types';
export declare function getDegradedFieldValues({ esClient, dataStream, degradedField, }: {
    esClient: ElasticsearchClient;
    dataStream: string;
    degradedField: string;
}): Promise<DegradedFieldValues>;
