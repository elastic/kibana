import type { Pagination, RulesListFilters } from '../../types';
import type { LoadRulesProps } from '../lib/rule_api';
type UseLoadRulesQueryProps = Omit<LoadRulesProps, 'http'> & {
    filters: RulesListFilters;
    hasDefaultRuleTypesFiltersOn?: boolean;
    onPage: (pagination: Pagination) => void;
    page: LoadRulesProps['page'];
    sort: LoadRulesProps['sort'];
    enabled: boolean;
    refresh?: Date;
    ruleTypeIds?: string[];
    consumers?: string[];
    hasReference?: {
        type: string;
        id: string;
    };
};
export declare const useLoadRulesQuery: (props: UseLoadRulesQueryProps) => {
    rulesState: {
        isLoading: boolean;
        data: import("../..").Rule[];
        totalItemCount: number;
        initialLoad: boolean;
    };
    lastUpdate: string;
    hasData: boolean;
    loadRules: <TPageData>(options?: (import("@tanstack/query-core").RefetchOptions & import("@tanstack/query-core").RefetchQueryFilters<TPageData>) | undefined) => Promise<import("@tanstack/query-core").QueryObserverResult<{
        page: number;
        perPage: number;
        total: number;
        data: import("../..").Rule[];
    }, unknown>>;
};
export {};
