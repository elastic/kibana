import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import type { HttpFetchOptions } from '@kbn/core/public';
import type { MappingRuntimeFields } from '@elastic/elasticsearch/lib/api/types';
import type { MinimumTimeRangeOption } from '../../../../common/embeddables/pattern_analysis/types';
export declare function useMinimumTimeRange(): {
    getMinimumTimeRange: (index: string, timeField: string, timeRange: {
        from: number;
        to: number;
    }, minimumTimeRangeOption: MinimumTimeRangeOption, queryIn: QueryDslQueryContainer, runtimeMappings: MappingRuntimeFields | undefined, headers?: HttpFetchOptions["headers"]) => Promise<{
        useSubAgg: boolean;
        from: number;
        to: number;
    }>;
    cancelRequest: () => void;
    minimumTimeRangeOption: MinimumTimeRangeOption;
    setMinimumTimeRangeOption: (value: MinimumTimeRangeOption) => void;
};
