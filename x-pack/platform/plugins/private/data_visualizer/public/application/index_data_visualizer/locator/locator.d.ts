import type { SerializableRecord } from '@kbn/utility-types';
import type { Filter, TimeRange } from '@kbn/es-query';
import type { RefreshInterval } from '@kbn/data-plugin/common';
import type { LocatorDefinition, LocatorPublic } from '@kbn/share-plugin/common';
import type { SearchQueryLanguage } from '@kbn/ml-query-utils';
export declare const DATA_VISUALIZER_APP_LOCATOR = "DATA_VISUALIZER_APP_LOCATOR";
export interface IndexDataVisualizerLocatorParams extends SerializableRecord {
    /**
     * Optionally set saved search ID.
     */
    savedSearchId?: string;
    /**
     * Optionally set data view ID.
     */
    dataViewId?: string;
    /**
     * Optionally set the time range in the time picker.
     */
    timeRange?: TimeRange;
    /**
     * Optionally set the refresh interval.
     */
    refreshInterval?: RefreshInterval & SerializableRecord;
    /**
     * Optionally set a query.
     */
    query?: {
        searchQuery: SerializableRecord;
        searchString: string | SerializableRecord;
        searchQueryLanguage: SearchQueryLanguage;
    };
    /**
     * Optionally set individual query settings.
     */
    searchQuery?: SerializableRecord;
    searchString?: string | SerializableRecord;
    searchQueryLanguage?: SearchQueryLanguage;
    /**
     * If not given, will use the uiSettings configuration for `storeInSessionStorage`. useHash determines
     * whether to hash the data in the url to avoid url length issues.
     */
    useHash?: boolean;
    /**
     * Optionally set visible field names.
     */
    visibleFieldNames?: string[];
    /**
     * Optionally set visible field types.
     */
    visibleFieldTypes?: string[];
    searchSessionId?: string;
    filters?: Filter[];
    showAllFields?: boolean;
    showEmptyFields?: boolean;
    pageSize?: number;
    sortDirection?: 'asc' | 'desc';
    samplerShardSize?: number;
    pageIndex?: number;
    sortField?: string;
    showDistributions?: number;
}
export type IndexDataVisualizerLocator = LocatorPublic<IndexDataVisualizerLocatorParams>;
export declare class IndexDataVisualizerLocatorDefinition implements LocatorDefinition<IndexDataVisualizerLocatorParams> {
    readonly id = "DATA_VISUALIZER_APP_LOCATOR";
    constructor();
    readonly getLocation: (params: IndexDataVisualizerLocatorParams) => Promise<{
        app: string;
        path: string;
        state: {};
    }>;
}
