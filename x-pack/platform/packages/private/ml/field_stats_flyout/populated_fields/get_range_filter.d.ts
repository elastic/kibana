import type { estypes } from '@elastic/elasticsearch';
import type { TimeRange as TimeRangeMs } from '@kbn/ml-date-picker';
interface RangeFilter {
    range: Record<string, estypes.QueryDslRangeQuery>;
}
interface MatchAllFilter {
    bool: {
        must: {
            match_all: {};
        };
    };
}
/**
 * Get range filter for datetime field. Both arguments are optional.
 * @param datetimeField
 * @param timeRange
 * @returns range filter
 */
export declare const getRangeFilter: (datetimeField?: string, timeRange?: TimeRangeMs) => RangeFilter | MatchAllFilter;
export {};
