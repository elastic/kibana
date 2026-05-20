import type { TypedLensByValueInput } from '@kbn/lens-plugin/public';
import type { PreviewColumn } from './use_preview';
export interface UsePreviewChartResult {
    /** Lens attributes needed to render the chart, or undefined while building */
    lensAttributes: TypedLensByValueInput['attributes'] | undefined;
    /** Time range for the chart derived from the lookback window */
    timeRange: {
        from: string;
        to: string;
    } | undefined;
    /** Whether the chart attributes are currently being built */
    isLoading: boolean;
    /** Whether the chart attributes failed to build */
    hasError: boolean;
}
export interface UsePreviewChartParams {
    /** The full ES|QL query */
    query: string;
    /** The time field name for the date histogram */
    timeField: string;
    /** The lookback duration string (e.g. '5m', '1h') */
    lookback: string;
    /** ES|QL columns from the preview query result (used for suggestions) */
    esqlColumns?: PreviewColumn[];
    /** Whether the chart is enabled (defaults to true) */
    enabled?: boolean;
}
/**
 * Hook that builds Lens embeddable attributes for a preview chart using
 * the Lens plugin's public `stateHelperApi().suggestions` API directly,
 * together with `getLensAttributesFromSuggestion` to convert the top
 * suggestion into renderable Lens attributes.
 *
 * For STATS queries (transformational commands), Lens suggestions will
 * auto-detect the most appropriate chart type from the aggregated columns.
 * For plain queries, Lens generates a time histogram suggestion.
 *
 * Uses the same debounce timing as `usePreview` to keep the chart and grid
 * visually in sync.
 */
export declare const usePreviewChart: ({ query, timeField, lookback, esqlColumns, enabled, }: UsePreviewChartParams) => UsePreviewChartResult;
