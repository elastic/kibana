import type { FC, PropsWithChildren } from 'react';
import React from 'react';
import type { DataView } from '@kbn/data-views-plugin/common';
import type { DataViewsPublicPluginStart } from '@kbn/data-views-plugin/public';
import type { SavedSearch } from '@kbn/saved-search-plugin/public';
export declare const DataSourceContext: React.Context<DataViewAndSavedSearch>;
export declare function useDataSource(): DataViewAndSavedSearch;
export interface DataViewAndSavedSearch {
    savedSearch: SavedSearch | null;
    dataView: DataView;
}
export interface DataSourceContextProviderProps {
    dataViews: DataViewsPublicPluginStart;
    dataViewId?: string;
    savedSearchId?: string;
    /** Output resolves data view objects */
    onChange?: (update: {
        dataViews: DataView[];
    }) => void;
}
/**
 * Context provider that resolves current data view and the saved search
 *
 * @param children
 * @constructor
 */
export declare const DataSourceContextProvider: FC<PropsWithChildren<DataSourceContextProviderProps>>;
