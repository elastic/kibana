import type { RulesListFilters } from '../../types';
export interface UseLoadRuleAggregationsQueryProps {
    filters: RulesListFilters;
    enabled: boolean;
    ruleTypeIds?: string[];
    consumers?: string[];
    refresh?: Date;
}
export declare const useLoadRuleAggregationsQuery: (props: UseLoadRuleAggregationsQueryProps) => {
    loadRuleAggregations: <TPageData>(options?: (import("@tanstack/query-core").RefetchOptions & import("@tanstack/query-core").RefetchQueryFilters<TPageData>) | undefined) => Promise<import("@tanstack/query-core").QueryObserverResult<import("../lib/rule_api/aggregate_helpers").AggregateRulesResponse, unknown>>;
    rulesStatusesTotal: Record<string, number>;
    rulesLastRunOutcomesTotal: Record<string, number>;
    isLoading: boolean;
};
