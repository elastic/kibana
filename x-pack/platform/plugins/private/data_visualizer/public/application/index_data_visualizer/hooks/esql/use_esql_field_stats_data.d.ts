import type { QueryDslQueryContainer } from '@kbn/data-views-plugin/common/types';
import type { AggregateQuery, TimeRange } from '@kbn/es-query';
import type { DataStatsFetchProgress, FieldStats } from '../../../../../common/types/field_stats';
import type { Column } from './use_esql_overall_stats_data';
export declare const useESQLFieldStatsData: <T extends Column>({ searchQuery, columns: allColumns, filter, limit, timeRange, }: {
    searchQuery?: AggregateQuery;
    columns?: T[];
    filter?: QueryDslQueryContainer;
    limit: number;
    timeRange?: TimeRange;
}) => {
    fieldStats: Map<string, FieldStats> | undefined;
    fieldStatsProgress: DataStatsFetchProgress;
    cancelFieldStatsRequest: () => void;
};
