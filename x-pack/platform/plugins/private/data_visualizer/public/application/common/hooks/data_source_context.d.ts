import type { DataView } from '@kbn/data-views-plugin/common';
import type { SavedSearch } from '@kbn/saved-search-plugin/public';
export declare const DataSourceContext: import("react").Context<{
    dataView: DataView | never;
    savedSearch: SavedSearch | null;
}>;
export declare function useDataSource(): {
    dataView: DataView | never;
    savedSearch: SavedSearch | null;
};
