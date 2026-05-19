import type { IUiSettingsClient } from '@kbn/core/public';
import type { Query, Filter, AggregateQuery } from '@kbn/es-query';
import type { DataView } from '@kbn/data-views-plugin/public';
import type { SavedSearch } from '@kbn/saved-search-plugin/public';
import type { FilterManager } from '@kbn/data-plugin/public';
import type { SearchQueryLanguage } from '@kbn/ml-query-utils';
/**
 * Extract query data from the saved search object
 * with overrides from the provided query data and/or filters
 */
export declare function getEsQueryFromSavedSearch({ dataView, uiSettings, savedSearch, query, filters, filterManager, }: {
    dataView: DataView;
    uiSettings: IUiSettingsClient;
    savedSearch: SavedSearch | null | undefined;
    query?: Query | AggregateQuery;
    filters?: Filter[];
    filterManager?: FilterManager;
}): {
    searchQuery: any;
    searchString: string | {
        [key: string]: any;
    };
    queryLanguage: SearchQueryLanguage;
    queryOrAggregateQuery?: undefined;
} | {
    searchQuery: {
        bool: import("@kbn/es-query").BoolQuery;
    };
    searchString: string | {
        [key: string]: any;
    };
    queryLanguage: SearchQueryLanguage;
    queryOrAggregateQuery: Query;
} | undefined;
