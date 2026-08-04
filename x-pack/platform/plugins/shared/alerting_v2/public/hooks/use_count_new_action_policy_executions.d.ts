import type { PolicyExecutionOutcomeFilter } from '@kbn/alerting-v2-schemas';
interface UseCountNewActionPolicyExecutionsParams {
    since: string;
    search?: string;
    ruleIds?: string[];
    outcome?: PolicyExecutionOutcomeFilter;
    enabled?: boolean;
}
export declare const useCountNewActionPolicyExecutions: ({ since, search, ruleIds, outcome, enabled, }: UseCountNewActionPolicyExecutionsParams) => import("@tanstack/react-query").UseQueryResult<{
    items: {
        dispatched_at: string;
        policy: {
            id: string;
            name?: string | null | undefined;
        };
        outcome: "throttled" | "dispatched";
        episode_count: number;
        action_group_count: number;
        rules: {
            id: string;
            name?: string | null | undefined;
        }[];
        totalRuleCount: number;
        workflows: {
            id: string;
            name?: string | null | undefined;
        }[];
    }[];
    page: number;
    perPage: number;
    totalEvents: number;
    searchMatches: {
        policies: number;
        rules: number;
        cap: number;
    } | null;
}, Error>;
export {};
