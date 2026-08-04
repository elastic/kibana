import type { ListRuleExecutionsRequest, RuleExecutionOutcome } from '@kbn/alerting-v2-schemas';
import { type Complete } from '../mapper_types';
export interface ListRuleExecutionsUiParams {
    page?: number;
    perPage?: number;
    ruleIds?: string[];
    outcome?: RuleExecutionOutcome[];
    from?: string;
    to?: string;
    sort?: 'startedAt' | 'duration';
    sortOrder?: 'asc' | 'desc';
}
export declare const toListRuleExecutionsRequest: ({ page, perPage, ruleIds, outcome, from, to, sort, sortOrder, ...rest }: ListRuleExecutionsUiParams) => Complete<Partial<ListRuleExecutionsRequest>>;
export declare const useFetchRuleExecutions: (params: ListRuleExecutionsUiParams) => import("@tanstack/react-query").UseQueryResult<{
    items: {
        id: string;
        rule: {
            id: string;
            version: number | null;
        };
        spaceId: string;
        startedAt: string;
        endedAt: string;
        timings: {
            duration: number;
            scheduledDelay: number;
        };
        outcome: "success" | "failure";
        reason: string | null;
        error: {
            message: string;
            stackTrace: string | null;
        } | null;
    }[];
    total: number;
    page: number;
    perPage: number;
}, Error>;
