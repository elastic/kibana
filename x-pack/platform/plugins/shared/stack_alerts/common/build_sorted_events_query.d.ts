import type { estypes } from '@elastic/elasticsearch';
import type { ESSearchRequest } from '@kbn/es-types';
interface BuildSortedEventsQueryOpts {
    aggs?: Record<string, estypes.AggregationsAggregationContainer>;
    track_total_hits: boolean | number;
    index: estypes.Indices;
    size: number;
}
export interface BuildSortedEventsQuery extends BuildSortedEventsQueryOpts {
    filter: unknown;
    from: string;
    to: string;
    sortOrder?: 'asc' | 'desc';
    searchAfterSortId: string | number | undefined;
    timeField: string;
    fields?: string[];
    runtime_mappings?: unknown;
    _source?: unknown;
}
export declare const buildSortedEventsQuery: ({ aggs, index, from, to, filter, size, searchAfterSortId, sortOrder, timeField, track_total_hits, fields, runtime_mappings, _source, }: BuildSortedEventsQuery) => ESSearchRequest;
export {};
