import type { estypes } from '@elastic/elasticsearch';
export * from '../../common/ui';
export type FeatureIdsResponse = estypes.SearchResponse<unknown, {
    consumer: {
        buckets: Array<{
            key: string;
            doc_count: number;
        }>;
    };
    producer: {
        buckets: Array<{
            key: string;
            doc_count: number;
        }>;
    };
    ruleTypeIds: {
        buckets: Array<{
            key: string;
            doc_count: number;
        }>;
    };
}>;
