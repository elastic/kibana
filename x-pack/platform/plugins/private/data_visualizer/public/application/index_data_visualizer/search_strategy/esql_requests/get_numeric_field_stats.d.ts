import type { TimeRange } from '@kbn/es-query';
import type { UseCancellableSearch } from '@kbn/ml-cancellable-search';
import type { QueryDslQueryContainer } from '@kbn/data-views-plugin/common/types';
import type { Column } from '../../hooks/esql/use_esql_overall_stats_data';
import type { FieldStatsError, NonSampledNumericFieldStats } from '../../../../../common/types/field_stats';
interface Params {
    runRequest: UseCancellableSearch['runRequest'];
    columns: Column[];
    esqlBaseQuery: string;
    filter?: QueryDslQueryContainer;
    timeRange?: TimeRange;
}
export declare const getESQLNumericFieldStats: ({ runRequest, columns, esqlBaseQuery, filter, timeRange, }: Params) => Promise<Array<NonSampledNumericFieldStats | FieldStatsError>>;
export {};
