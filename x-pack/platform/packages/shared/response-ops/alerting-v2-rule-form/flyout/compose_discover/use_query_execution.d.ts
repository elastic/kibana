import type { EuiDataGridColumn } from '@elastic/eui';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
export interface QueryColumn extends EuiDataGridColumn {
    esType: string;
}
export interface QueryExecutionResult {
    columns: QueryColumn[];
    rows: Array<Record<string, string | null>>;
    totalRowCount: number;
    isLoading: boolean;
    isError: boolean;
    error: string | null;
    run: () => void;
    hasRun: boolean;
    /** The query that was last explicitly executed — use this for the chart to avoid auto-refresh on keystrokes. */
    lastExecutedQuery: string | null;
}
interface TimeRange {
    from: string;
    to: string;
}
interface UseQueryExecutionParams {
    query: string;
    timeField: string;
    timeRange: TimeRange;
    data: DataPublicPluginStart;
}
export declare const useQueryExecution: ({ query, timeField, timeRange, data, }: UseQueryExecutionParams) => QueryExecutionResult;
export {};
