import type { LoadExecutionLogAggregationsProps, LoadGlobalExecutionLogAggregationsProps } from '../lib/rule_api/load_execution_log_aggregations';
interface CommonProps {
    onError?: (err: any) => void;
}
type LoadExecutionLogProps = LoadExecutionLogAggregationsProps & CommonProps;
type LoadGlobalExecutionLogProps = LoadGlobalExecutionLogAggregationsProps & CommonProps;
export type UseLoadRuleEventLogsProps = LoadExecutionLogProps | LoadGlobalExecutionLogProps;
export declare function useLoadRuleEventLogs(props: UseLoadRuleEventLogsProps): {
    data: import("../../../../alerting/common").IExecutionLogResult | undefined;
    hasExceedLogs: any;
    isLoading: boolean;
    loadEventLogs: <TPageData>(options?: (import("@tanstack/query-core").RefetchOptions & import("@tanstack/query-core").RefetchQueryFilters<TPageData>) | undefined) => Promise<import("@tanstack/query-core").QueryObserverResult<import("../../../../alerting/common").IExecutionLogResult, any>>;
};
export {};
