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
    /**
     * The active tab. Each tab remembers its own last-executed query/time
     * range/time field, so switching tabs shows that tab's own cached result —
     * never another tab's — without re-running or clearing anything. Defaults
     * to a single shared tab for callers with no tab concept.
     */
    tab?: string;
}
export declare const useQueryExecution: ({ query, timeField, timeRange, data, tab, }: UseQueryExecutionParams) => QueryExecutionResult;
export {};
