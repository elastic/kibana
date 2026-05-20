import type { HttpStart } from '@kbn/core/public';
import type { ListPolicyExecutionHistoryParams, PolicyExecutionHistoryItem } from '@kbn/alerting-v2-schemas';
export type { PolicyExecutionHistoryItem };
export declare class ExecutionHistoryApi {
    private readonly http;
    constructor(http: HttpStart);
    listExecutionHistory(params?: ListPolicyExecutionHistoryParams): Promise<{
        items: {
            '@timestamp': string;
            policy: {
                id: string;
                name?: string | null | undefined;
            };
            rule: {
                id: string;
                name?: string | null | undefined;
            };
            outcome: "throttled" | "dispatched";
            episode_count: number;
            action_group_count: number;
            workflows: {
                id: string;
                name?: string | null | undefined;
            }[];
        }[];
        page: number;
        perPage: number;
        totalEvents: number;
    }>;
    countNewSince(since: string): Promise<{
        count: number;
    }>;
}
