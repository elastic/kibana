import type { IUiSettingsClient } from '@kbn/core/public';
import type { SavedSearch } from '@kbn/saved-search-plugin/public';
import type { FilterManager } from '@kbn/data-plugin/public';
import type { Query, Filter } from '@kbn/es-query';
import type { DataView } from '@kbn/data-views-plugin/public';
import { type SearchQueryLanguage } from '@kbn/ml-query-utils';
/**
 * Extract query data from the saved search object
 * with overrides from the provided query data and/or filters
 */
export declare function getEsQueryFromSavedSearch({ dataView, uiSettings, savedSearch, query, filters, filterManager, }: {
    dataView: DataView;
    uiSettings: IUiSettingsClient;
    savedSearch: Pick<SavedSearch, 'searchSource'> | null | undefined;
    query?: Query;
    filters?: Filter[];
    filterManager?: FilterManager;
}): {
    searchQuery: any;
    searchString: string | {
        [key: string]: any;
    };
    queryLanguage: SearchQueryLanguage;
} | undefined;
