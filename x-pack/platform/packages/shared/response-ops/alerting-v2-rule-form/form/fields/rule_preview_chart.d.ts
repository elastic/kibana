import React from 'react';
import type { PreviewColumn } from '../hooks/use_preview';
export interface PreviewChartProps {
    /** The assembled ES|QL query to visualize */
    query: string;
    /** The time field name for bucketing */
    timeField: string;
    /** The lookback duration string (e.g. '5m', '1h') */
    lookback: string;
    /** ES|QL columns from the preview query result (used for STATS query suggestions) */
    esqlColumns?: PreviewColumn[];
}
/**
 * Renders a Lens chart for the rule preview.
 *
 * For non-STATS ES|QL queries, this renders a time histogram (count over time).
 * For STATS queries, it uses the Lens suggestions API to pick an appropriate
 * chart type from the aggregated columns.
 *
 * Accepts the ES|QL query, time field, lookback, and optional columns as props
 * so it can be reused across both rule and recovery preview panels.
 *
 * This component renders only the chart content (no panel wrapper) and is
 * intended to be placed inside a parent panel such as `QueryResultsGrid`.
 */
export declare const PreviewChart: ({ query, timeField, lookback, esqlColumns }: PreviewChartProps) => React.JSX.Element | null;
