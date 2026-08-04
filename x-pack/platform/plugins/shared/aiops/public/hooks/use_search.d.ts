import type { DataView } from '@kbn/data-views-plugin/public';
import type { SavedSearch } from '@kbn/saved-search-plugin/public';
import { type AiOpsIndexBasedAppState } from '../application/url_state/common';
export declare const useSearch: ({ dataView, savedSearch, }: {
    dataView: DataView;
    savedSearch: Pick<SavedSearch, "searchSource"> | null;
}, aiopsListState: AiOpsIndexBasedAppState, readOnly?: boolean) => {
    searchString: string | {
        [key: string]: any;
    } | undefined;
    searchQueryLanguage: import("@kbn/ml-query-utils").SearchQueryLanguage;
    searchQuery?: import("@kbn/data-views-plugin/common/types").QueryDslQueryContainer;
} | {
    searchQuery: any;
    searchString: string | {
        [key: string]: any;
    };
    searchQueryLanguage: import("@kbn/ml-query-utils").SearchQueryLanguage;
};
