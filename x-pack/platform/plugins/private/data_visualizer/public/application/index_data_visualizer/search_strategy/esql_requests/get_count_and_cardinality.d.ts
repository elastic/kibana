import type { TimeRange } from '@kbn/es-query';
import type { UseCancellableSearch } from '@kbn/ml-cancellable-search';
import type { estypes } from '@elastic/elasticsearch';
import type { NonAggregatableField } from '../../types/overall_stats';
import type { Column } from '../../hooks/esql/use_esql_overall_stats_data';
import type { AggregatableField } from '../../types/esql_data_visualizer';
import type { HandleErrorCallback } from './handle_error';
/**
 * Fetching count and cardinality in chunks of 30 fields per request in parallel
 * limiting at 10 requests maximum at a time
 * @param runRequest
 * @param fields
 * @param esqlBaseQueryWithLimit
 */
export declare const getESQLOverallStats: ({ runRequest, fields, esqlBaseQueryWithLimit, filter, limitSize, totalCount, onError, timeRange, }: {
    runRequest: UseCancellableSearch["runRequest"];
    fields: Column[];
    esqlBaseQueryWithLimit: string;
    filter?: estypes.QueryDslQueryContainer;
    limitSize: number;
    totalCount: number;
    onError?: HandleErrorCallback;
    timeRange?: TimeRange;
}) => Promise<{
    aggregatableExistsFields: AggregatableField[];
    aggregatableNotExistsFields: AggregatableField[];
    nonAggregatableExistsFields: NonAggregatableField[];
    nonAggregatableNotExistsFields: NonAggregatableField[];
} | undefined>;
