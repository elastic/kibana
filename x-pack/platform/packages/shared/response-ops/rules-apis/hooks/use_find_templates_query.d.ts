import type { ToastsStart } from '@kbn/core-notifications-browser';
import type { SetOptional } from 'type-fest';
import type { FindRuleTemplatesParams, FindRuleTemplatesResponse } from '../apis/find_rule_templates';
export interface UseFindTemplatesQueryParams extends SetOptional<FindRuleTemplatesParams, 'page'> {
    enabled?: boolean;
    refresh?: Date;
    toasts: ToastsStart;
}
export declare const getKey: (params: Omit<UseFindTemplatesQueryParams, "http" | "toasts" | "enabled">) => (string | Omit<UseFindTemplatesQueryParams, "enabled" | "http" | "toasts">)[];
export declare const useFindTemplatesQuery: ({ http, toasts, enabled, refresh, page, perPage, sortField, sortOrder, search, defaultSearchOperator, ruleTypeId, tags, }: UseFindTemplatesQueryParams) => {
    templates: import("../apis/find_rule_templates").RuleTemplate[];
    totalTemplates: number;
    hasNextPage: boolean | undefined;
    refetch: <TPageData>(options?: (import("@tanstack/query-core").RefetchOptions & import("@tanstack/query-core").RefetchQueryFilters<TPageData>) | undefined) => Promise<import("@tanstack/query-core").QueryObserverResult<import("@tanstack/query-core").InfiniteData<FindRuleTemplatesResponse>, Error>>;
    fetchNextPage: (options?: import("@tanstack/query-core").FetchNextPageOptions) => Promise<import("@tanstack/query-core").InfiniteQueryObserverResult<FindRuleTemplatesResponse, Error>>;
    isLoading: boolean;
    isFetching: boolean;
    isFetchingNextPage: boolean;
    isError: boolean;
};
