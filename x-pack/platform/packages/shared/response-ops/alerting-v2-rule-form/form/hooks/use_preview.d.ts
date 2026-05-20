import type { EuiDataGridColumn } from '@elastic/eui';
export interface PreviewColumn extends EuiDataGridColumn {
    /** The ES|QL column type (e.g. 'keyword', 'long', 'date') */
    esType: string;
}
export interface PreviewResult {
    /** Columns derived from the ES|QL response */
    columns: PreviewColumn[];
    /** Row data mapped from the ES|QL response values */
    rows: Array<Record<string, string | null>>;
    /** Total row count (before truncation) */
    totalRowCount: number;
    /** Whether the query is currently loading */
    isLoading: boolean;
    /** Whether the query resulted in an error */
    isError: boolean;
    /** Error message, if any */
    error: string | null;
    /** Field names selected as the grouping key */
    groupingFields: string[];
    /** Number of unique alert groups based on grouping field values, or null if no grouping is configured */
    uniqueGroupCount: number | null;
    /** Whether the current query is syntactically valid ES|QL (used to distinguish "no query" from "valid query with 0 results") */
    hasValidQuery: boolean;
    /** The assembled ES|QL query string passed to the preview */
    query: string;
    /** The time field name used for the range filter */
    timeField: string;
    /** The lookback duration string (e.g. '5m', '1h') */
    lookback: string;
}
export interface UsePreviewParams {
    /** The assembled ES|QL query string to execute */
    query: string;
    /** The time field name for the range filter */
    timeField: string;
    /** The lookback duration string (e.g. '5m', '1h') */
    lookback: string;
    /** Fields selected as the grouping key */
    groupingFields: string[];
    /** Whether the preview is enabled (defaults to true) */
    enabled?: boolean;
}
/**
 * Generic hook that executes an ES|QL query and returns preview results.
 *
 * Handles debouncing, time filtering, column/row mapping, and unique group
 * computation. Specialised hooks (rule preview, recovery preview) compose
 * this hook by watching the relevant form fields and assembling the query
 * before delegating here.
 */
export declare const usePreview: ({ query, timeField, lookback, groupingFields, enabled, }: UsePreviewParams) => PreviewResult;
