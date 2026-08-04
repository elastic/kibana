import type { ListPolicyExecutionHistoryRequest, PolicyExecutionOutcomeFilter } from '@kbn/alerting-v2-schemas';
import { type Complete } from '../mapper_types';
export interface ListExecutionHistoryUiParams {
    page?: number;
    perPage?: number;
    search?: string;
    ruleIds?: string[];
    outcome?: PolicyExecutionOutcomeFilter;
    episodeIds?: string[];
    startDate?: string;
}
export declare const toListExecutionHistoryRequest: ({ page, perPage, search, ruleIds, outcome, episodeIds, startDate, ...rest }: ListExecutionHistoryUiParams) => Complete<ListPolicyExecutionHistoryRequest>;
interface UseFetchExecutionHistoryParams {
    page: number;
    perPage: number;
    search?: string;
    ruleIds?: string[];
    outcome?: PolicyExecutionOutcomeFilter;
    episodeIds?: string[];
    startDate?: string;
}
export declare const useFetchExecutionHistory: ({ page, perPage, search, ruleIds, outcome, episodeIds, startDate, }: UseFetchExecutionHistoryParams) => import("@tanstack/react-query").UseQueryResult<{
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
