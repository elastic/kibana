import type { QueryDslQueryContainer } from '@kbn/data-views-plugin/common/types';
import type { AggregateQuery, TimeRange } from '@kbn/es-query';
import type { TimeBucketsInterval } from '@kbn/ml-time-buckets';
import type { DataStatsFetchProgress, DocumentCountStats } from '../../../../../common/types/field_stats';
import type { NonAggregatableField } from '../../types/overall_stats';
import type { AggregatableField } from '../../types/esql_data_visualizer';
interface ESQLColumn {
    type: string;
    name: string;
}
export interface Column extends ESQLColumn {
    secondaryType: string;
}
interface Data {
    totalFields?: number;
    timeFieldName?: string;
    columns?: Column[];
    totalCount?: number;
    nonAggregatableFields?: Array<{
        name: string;
        type: string;
    }>;
    aggregatableFields?: Array<{
        name: string;
        type: string;
        supportedAggs: Set<string>;
    }>;
    documentCountStats?: DocumentCountStats;
    overallStats?: {
        aggregatableExistsFields: AggregatableField[];
        aggregatableNotExistsFields: AggregatableField[];
        nonAggregatableExistsFields: NonAggregatableField[];
        nonAggregatableNotExistsFields: NonAggregatableField[];
    };
    exampleDocs: Array<{
        fieldName: string;
        examples: string[];
    }> | undefined;
}
export declare const getInitialData: () => Data;
export declare const useESQLOverallStatsData: (fieldStatsRequest: {
    id?: string;
    earliest: number | undefined;
    latest: number | undefined;
    aggInterval: TimeBucketsInterval;
    intervalMs: number;
    searchQuery: AggregateQuery;
    indexPattern: string | undefined;
    timeFieldName: string | undefined;
    lastRefresh: number;
    limit: number;
    filter?: QueryDslQueryContainer;
    totalCount?: number;
    timeRange?: TimeRange;
} | undefined) => {
    overallStatsProgress: DataStatsFetchProgress;
    cancelOverallStatsRequest: () => void;
    queryHistoryStatus: boolean | undefined;
    totalFields?: number;
    timeFieldName?: string;
    columns?: Column[];
    totalCount?: number;
    nonAggregatableFields?: Array<{
        name: string;
        type: string;
    }>;
    aggregatableFields?: Array<{
        name: string;
        type: string;
        supportedAggs: Set<string>;
    }>;
    documentCountStats?: DocumentCountStats;
    overallStats?: {
        aggregatableExistsFields: AggregatableField[];
        aggregatableNotExistsFields: AggregatableField[];
        nonAggregatableExistsFields: NonAggregatableField[];
        nonAggregatableNotExistsFields: NonAggregatableField[];
    };
    exampleDocs: Array<{
        fieldName: string;
        examples: string[];
    }> | undefined;
};
export {};
