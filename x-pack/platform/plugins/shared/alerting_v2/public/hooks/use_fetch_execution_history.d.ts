interface UseFetchExecutionHistoryParams {
    page: number;
    perPage: number;
}
export declare const useFetchExecutionHistory: ({ page, perPage }: UseFetchExecutionHistoryParams) => import("@kbn/react-query").UseQueryResult<{
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
}, Error>;
export {};
