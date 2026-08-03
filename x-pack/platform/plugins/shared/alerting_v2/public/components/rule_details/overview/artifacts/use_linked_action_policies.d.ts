/** Max policies evaluated by _match_for_rule; counts may undercount when the space has more. */
export declare const LINKED_ACTION_POLICIES_FETCH_LIMIT = 100;
export interface UseLinkedActionPoliciesResult {
    totalCount: number;
    catchAllCount: number;
    matchingCriteriaCount: number;
    /** True when the space has more policies than {@link LINKED_ACTION_POLICIES_FETCH_LIMIT} and some may not have been evaluated. */
    isCountTruncated: boolean;
    isLoading: boolean;
    isError: boolean;
    error: Error | null;
}
export declare const useLinkedActionPolicies: (ruleId: string) => UseLinkedActionPoliciesResult;
