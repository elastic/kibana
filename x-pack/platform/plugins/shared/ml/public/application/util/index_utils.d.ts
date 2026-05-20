import type { SavedSearch, SavedSearchPublicPluginStart } from '@kbn/saved-search-plugin/public';
import type { Query, Filter } from '@kbn/es-query';
import type { DataView, DataViewField, DataViewsContract } from '@kbn/data-views-plugin/common';
export interface DataViewAndSavedSearch {
    savedSearch: SavedSearch | null;
    dataView: DataView | null;
}
export declare const getDataViewAndSavedSearchCallback: (deps: {
    savedSearchService: SavedSearchPublicPluginStart;
    dataViewsService: DataViewsContract;
}) => (savedSearchId: string) => Promise<DataViewAndSavedSearch>;
export declare function getQueryFromSavedSearchObject(savedSearch: SavedSearch): {
    query: Query;
    filter: Filter[];
};
/**
 * Returns true if the index pattern contains a :
 * which means it is cross-cluster
 */
export declare function isCcsIndexPattern(indexPattern: string): boolean;
export declare function findMessageField(dataView: DataView): {
    dataView: DataView;
    field: DataViewField;
} | null;
