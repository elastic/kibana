import type { HttpStart } from '@kbn/core/public';
import type { ListRuleExecutionsRequest, ListRuleExecutionsResponse, ListPolicyExecutionHistoryRequest, PolicyExecutionHistoryItem, PolicyExecutionOutcomeFilter } from '@kbn/alerting-v2-schemas';
export type { ListRuleExecutionsResponse, PolicyExecutionHistoryItem, PolicyExecutionOutcomeFilter, };
export declare class ExecutionHistoryApi {
    private readonly http;
    constructor(http: HttpStart);
    listActionPolicyExecutions(params?: ListPolicyExecutionHistoryRequest): Promise<{
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
    }>;
    listRuleExecutions(params: Partial<ListRuleExecutionsRequest>): Promise<{
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
    }>;
}
