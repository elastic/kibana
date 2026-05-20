import type { DataView } from '@kbn/data-views-plugin/public';
import type { SavedSearch } from '@kbn/saved-search-plugin/public';
import type { BasicAppState } from '../../data_drift/types';
export declare const useSearch: ({ dataView, savedSearch }: {
    dataView: DataView;
    savedSearch: SavedSearch | null | undefined;
}, appState: BasicAppState, readOnly?: boolean) => {
    searchQuery: any;
    searchString: string | {
        [key: string]: any;
    };
    searchQueryLanguage: import("@kbn/ml-query-utils").SearchQueryLanguage;
};
