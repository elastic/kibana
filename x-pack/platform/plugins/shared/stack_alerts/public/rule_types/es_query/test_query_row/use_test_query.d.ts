import type { ParsedAggregationResults } from '@kbn/triggers-actions-ui-plugin/common';
import type { EuiDataGridColumn } from '@elastic/eui';
interface TestQueryPreview {
    cols: EuiDataGridColumn[];
    rows: Array<Record<string, string | null>>;
}
interface TestQueryFetchResponse {
    testResults: ParsedAggregationResults;
    isGrouped: boolean;
    timeWindow: string;
    isGroupedByRow?: boolean;
    preview?: TestQueryPreview;
    warning?: string;
}
/**
 * Hook used to test the data fetching execution by returning a number of found documents
 * Or in error in case it's failing
 */
export declare function useTestQuery(fetch: () => Promise<TestQueryFetchResponse>): {
    onTestQuery: () => Promise<void>;
    resetTestQueryResponse: () => void;
    testQueryResult: string | null;
    testQueryError: string | null;
    testQueryWarning: string | null;
    testQueryLoading: boolean;
    testQueryPreview: TestQueryPreview | null;
};
export {};
