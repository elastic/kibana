import type { TimeRange } from '@kbn/es-query';
import type { SpacesPluginStart } from '@kbn/spaces-plugin/public';
import type { ExpressionsStart } from '@kbn/expressions-plugin/public';
import type { Datatable } from '@kbn/expressions-plugin/common';
import { type EpisodesFilterState } from '../queries/episodes_query';
export interface UseEpisodesHistogramQueryOptions {
    services: {
        expressions: ExpressionsStart;
        spaces: SpacesPluginStart;
    };
    filterState: EpisodesFilterState;
    timeRange?: TimeRange;
    bucketInterval: string;
    breakdownField?: string;
}
export interface UseEpisodesHistogramQueryResult {
    table: Datatable | undefined;
    isLoading: boolean;
    error: Error | undefined;
    isCapHit: boolean;
    refetch: () => void;
}
export declare const useEpisodesHistogramQuery: ({ services, filterState, timeRange, bucketInterval, breakdownField, }: UseEpisodesHistogramQueryOptions) => UseEpisodesHistogramQueryResult;
