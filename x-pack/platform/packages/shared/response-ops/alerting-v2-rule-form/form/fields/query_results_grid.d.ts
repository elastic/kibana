import React from 'react';
import type { PreviewColumn } from '../hooks/use_preview';
export interface QueryResultsGridProps {
    /** Panel title displayed above the grid */
    title: string;
    /** data-test-subj applied to the EuiDataGrid element */
    dataTestSubj: string;
    /** Body text for the empty state (no query configured) */
    emptyBody: string;
    /** Body text for the no-results state (query returned 0 rows) */
    noResultsBody: string;
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
    groupingFields?: string[];
    /** Number of unique alert groups, or null if no grouping is configured */
    uniqueGroupCount?: number | null;
    /** Whether the current query is syntactically valid (distinguishes "no query" from "valid query with 0 results") */
    hasValidQuery?: boolean;
    /** The assembled ES|QL query string for the chart preview */
    query?: string;
    /** The time field name for the chart bucketing */
    timeField?: string;
    /** The lookback duration string for the chart time range (e.g. '5m', '1h') */
    lookback?: string;
}
/**
 * Shared query results grid panel.
 *
 * Renders a titled EuiPanel containing an EuiDataGrid with loading, empty,
 * error, and success states. Annotates grouping columns with a key icon
 * and displays a unique-group-count badge in the footer.
 *
 * Used by both the rule preview and recovery preview components.
 */
export declare const QueryResultsGrid: ({ title, dataTestSubj, emptyBody, noResultsBody, columns, rows, totalRowCount, isLoading, isError, error, groupingFields, uniqueGroupCount, hasValidQuery, query, timeField, lookback, }: QueryResultsGridProps) => React.JSX.Element;
