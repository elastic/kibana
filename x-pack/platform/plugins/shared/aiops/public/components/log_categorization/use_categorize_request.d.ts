import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import { type CategorizationAdditionalFilter } from '@kbn/aiops-log-pattern-analysis/create_category_request';
import { processCategoryResults } from '@kbn/aiops-log-pattern-analysis/process_category_results';
import type { MappingRuntimeFields } from '@elastic/elasticsearch/lib/api/types';
import type { RandomSamplerStorage } from './sampling_menu';
import { RandomSampler } from './sampling_menu';
export type EventRate = Array<{
    key: number;
    docCount: number;
}>;
export declare function useCategorizeRequest(randomSamplerStorage: RandomSamplerStorage): {
    runCategorizeRequest: (index: string, field: string, timeField: string, timeRange: {
        from: number;
        to: number;
    }, query: QueryDslQueryContainer, runtimeMappings: MappingRuntimeFields | undefined, projectRouting: string | undefined, intervalMs?: number, additionalFilter?: CategorizationAdditionalFilter) => Promise<ReturnType<typeof processCategoryResults>>;
    cancelRequest: () => void;
    randomSampler: RandomSampler;
};
