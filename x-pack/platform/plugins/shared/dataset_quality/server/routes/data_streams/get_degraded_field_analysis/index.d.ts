import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import type { DegradedFieldAnalysis } from '../../../../common/api_types';
export declare function analyzeDegradedField({ esClient, dataStream, degradedField, lastBackingIndex, }: {
    esClient: ElasticsearchClient;
    dataStream: string;
    degradedField: string;
    lastBackingIndex: string;
}): Promise<DegradedFieldAnalysis>;
