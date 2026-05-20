import { type QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import type { ChangePointAnnotation, ChangePointDetectionRequestParams, FieldConfig } from './change_point_detection_context';
export declare function useChangePointResults(fieldConfig: FieldConfig, requestParams: ChangePointDetectionRequestParams, query: QueryDslQueryContainer, splitFieldCardinality: number | null): {
    results: ChangePointAnnotation[];
    isLoading: boolean;
    isUsingSampleData: boolean;
    reset: () => void;
    progress: number | null;
};
