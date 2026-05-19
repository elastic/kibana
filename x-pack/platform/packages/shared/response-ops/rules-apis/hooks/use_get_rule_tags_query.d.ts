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
    refetch: <TPageData>(options?: (import("@kbn/react-query").RefetchOptions & import("@kbn/react-query").RefetchQueryFilters<TPageData>) | undefined) => Promise<import("@kbn/react-query").QueryObserverResult<import("@kbn/react-query").InfiniteData<GetRuleTagsResponse>, unknown>>;
    isLoading: boolean;
    fetchNextPage: (options?: import("@kbn/react-query").FetchNextPageOptions) => Promise<import("@kbn/react-query").InfiniteQueryObserverResult<GetRuleTagsResponse, unknown>>;
    isError: boolean;
};
export {};
