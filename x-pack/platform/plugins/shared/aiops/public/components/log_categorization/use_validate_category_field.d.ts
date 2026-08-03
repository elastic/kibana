import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import type { MappingRuntimeFields } from '@elastic/elasticsearch/lib/api/types';
import type { FieldValidationResults } from '@kbn/ml-category-validator';
import type { HttpFetchOptions } from '@kbn/core/public';
export declare function useValidateFieldRequest(): {
    runValidateFieldRequest: (index: string, field: string, timeField: string, timeRange: {
        from: number;
        to: number;
    }, queryIn: QueryDslQueryContainer, runtimeMappings: MappingRuntimeFields | undefined, projectRouting: string | undefined, headers?: HttpFetchOptions["headers"]) => Promise<FieldValidationResults>;
    cancelRequest: () => void;
};
