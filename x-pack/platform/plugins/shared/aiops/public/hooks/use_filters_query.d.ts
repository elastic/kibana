import React, { type FC, type PropsWithChildren } from 'react';
import type { Filter, Query, TimeRange } from '@kbn/es-query';
import type { TimeRangeBounds } from '@kbn/data-plugin/common';
import type { PublishesFilters } from '@kbn/presentation-publishing';
export declare const FilterQueryContext: React.Context<{
    filters: Filter[];
    query: Query;
    timeRange: TimeRange;
    searchBounds: TimeRangeBounds;
    interval: string;
}>;
/**
 * Helper context to provide the latest
 *   - filter
 *   - query
 *   - time range
 * from the data plugin.
 * Also merges custom filters and queries provided with an input.
 *
 * @param children
 * @constructor
 */
export declare const FilterQueryContextProvider: FC<PropsWithChildren<{
    timeRange?: TimeRange;
    filtersApi?: PublishesFilters;
}>>;
export declare const useFilterQueryUpdates: () => {
    filters: Filter[];
    query: Query;
    timeRange: TimeRange;
    searchBounds: TimeRangeBounds;
    interval: string;
};
