interface UseCountNewExecutionHistoryEventsParams {
    since: string;
    enabled?: boolean;
}
export declare const useCountNewExecutionHistoryEvents: ({ since, enabled, }: UseCountNewExecutionHistoryEventsParams) => import("@kbn/react-query").UseQueryResult<{
    count: number;
}, Error>;
export {};
