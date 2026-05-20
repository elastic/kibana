import type { PropsWithChildren } from 'react';
import React, { type FC } from 'react';
import type { DataView } from '@kbn/data-views-plugin/common';
import type { SavedSearch } from '@kbn/saved-search-plugin/public';
export interface DataSourceContextValue {
    combinedQuery: any;
    selectedDataView: DataView;
    selectedSavedSearch: SavedSearch | null;
}
export declare const DataSourceContext: React.Context<DataSourceContextValue>;
/**
 * Context provider that resolves current data view and the saved search from the URL state.
 *
 * @param children
 * @constructor
 */
export declare const DataSourceContextProvider: FC<PropsWithChildren<unknown>>;
export declare const useDataSource: () => DataSourceContextValue;
