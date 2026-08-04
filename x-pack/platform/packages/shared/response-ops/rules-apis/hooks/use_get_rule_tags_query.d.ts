import type { ToastsStart } from '@kbn/core-notifications-browser';
import type { SetOptional } from 'type-fest';
import type { GetRuleTagsParams, GetRuleTagsResponse } from '../apis/get_rule_tags';
interface UseGetRuleTagsQueryParams extends SetOptional<GetRuleTagsParams, 'page'> {
    refresh?: Date;
    enabled: boolean;
    toasts: ToastsStart;
}
export declare const getKey: ({ ruleTypeIds, search, perPage, page, refresh, }: {
    ruleTypeIds?: string[];
    search?: string;
    perPage?: number;
    page: number;
    refresh?: Date;
}) => readonly [string, "getRuleTags", string[] | undefined, string | undefined, number | undefined, number, {
    readonly refresh: string | undefined;
}];
export declare function useGetRuleTagsQuery({ enabled, refresh, search, ruleTypeIds, perPage, page, http, toasts, }: UseGetRuleTagsQueryParams): {
    tags: string[];
    hasNextPage: boolean | undefined;
    refetch: <TPageData>(options?: (import("@tanstack/query-core").RefetchOptions & import("@tanstack/query-core").RefetchQueryFilters<TPageData>) | undefined) => Promise<import("@tanstack/query-core").QueryObserverResult<import("@tanstack/query-core").InfiniteData<GetRuleTagsResponse>, unknown>>;
    isLoading: boolean;
    fetchNextPage: (options?: import("@tanstack/query-core").FetchNextPageOptions) => Promise<import("@tanstack/query-core").InfiniteQueryObserverResult<GetRuleTagsResponse, unknown>>;
    isError: boolean;
};
export {};
