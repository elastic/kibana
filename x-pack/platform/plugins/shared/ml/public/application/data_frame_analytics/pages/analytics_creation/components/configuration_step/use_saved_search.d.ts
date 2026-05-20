export type SavedSearchQuery = Record<string, any> | null | undefined;
export type SavedSearchQueryStr = string | {
    [key: string]: any;
} | null | undefined;
export declare function useSavedSearch(): {
    savedSearchQuery: SavedSearchQuery;
    savedSearchQueryStr: SavedSearchQueryStr;
};
