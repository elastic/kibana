import type { AggregationsBuckets } from '@elastic/elasticsearch/lib/api/types';
export interface AvgActionRunOutcomeByConnectorTypeBucket {
    key: string;
    doc_count: number;
    outcome: {
        count: {
            buckets: Array<{
                key: string;
                doc_count: number;
            }>;
        };
    };
}
export declare function parseActionRunOutcomeByConnectorTypesBucket(connectorTypeBuckets?: AggregationsBuckets<AvgActionRunOutcomeByConnectorTypeBucket>): {};
