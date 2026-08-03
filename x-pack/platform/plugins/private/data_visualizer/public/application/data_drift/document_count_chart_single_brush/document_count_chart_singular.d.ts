import { type FC } from 'react';
import type { BarStyleAccessor, RectAnnotationSpec } from '@elastic/charts/dist/chart_types/xy_chart/utils/specs';
import type { IUiSettingsClient } from '@kbn/core/public';
import { type LogRateHistogramItem } from '@kbn/aiops-log-rate-analysis';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import type { ChartsPluginStart } from '@kbn/charts-plugin/public';
import type { FieldFormatsStart } from '@kbn/field-formats-plugin/public';
declare global {
    interface Window {
        /**
         * Flag used to enable debugState on elastic charts
         */
        _echDebugStateFlag?: boolean;
    }
}
/**
 * Brush settings
 */
export interface BrushSettings {
    /**
     * Optional label name for brush
     */
    label?: string;
    /**
     * Optional style for brush
     */
    annotationStyle?: RectAnnotationSpec['style'];
    /**
     * Optional width for brush
     */
    badgeWidth?: number;
}
/**
 * Callback function which gets called when the brush selection has changed
 *
 * @param windowParameters Brush selection time ranges.
 * @param force Force update
 */
export type BrushSelectionUpdateHandler = (windowParameters: SingleBrushWindowParameters, force: boolean) => void;
/**
 * Props for document count chart
 */
export interface DocumentCountChartProps {
    id?: string;
    /** List of Kibana services that are required as dependencies */
    dependencies: {
        data: DataPublicPluginStart;
        charts: ChartsPluginStart;
        fieldFormats: FieldFormatsStart;
        uiSettings: IUiSettingsClient;
    };
    /** Optional callback for handling brush selection updates */
    brushSelectionUpdateHandler?: BrushSelectionUpdateHandler;
    /** Optional width */
    width?: number;
    /** Optional chart height */
    height?: number;
    /** Data chart points */
    chartPoints: LogRateHistogramItem[];
    /** Data chart points split */
    chartPointsSplit?: LogRateHistogramItem[];
    /** Start time range for the chart */
    timeRangeEarliest: number;
    /** Ending time range for the chart */
    timeRangeLatest: number;
    /** Time interval for the document count buckets */
    interval: number;
    /** Label to name the adjustedChartPointsSplit histogram */
    chartPointsSplitLabel: string;
    /** Whether or not brush has been reset */
    isBrushCleared: boolean;
    /** Timestamp for start of initial analysis */
    autoAnalysisStart?: number | SingleBrushWindowParameters;
    /** Optional style to override bar chart  */
    barStyleAccessor?: BarStyleAccessor;
    /** Optional color override for the default bar color for charts */
    barColorOverride?: string;
    /** Optional color override for the highlighted bar color for charts */
    barHighlightColorOverride?: string;
    /** Optional settings override for the 'brush' brush */
    brush?: BrushSettings;
    /** Optional data-test-subject */
    dataTestSubj?: string;
}
export interface SingleBrushWindowParameters {
    /** Time range minimum value */
    min: number;
    /** Time range maximum value */
    max: number;
}
/**
 * Document count chart with draggable brushes to select time ranges
 * by default use `Baseline` and `Deviation` for the badge names
 *
 * @param props DocumentCountChart component props
 * @returns The DocumentCountChart component.
 */
export declare const DocumentCountChartWithBrush: FC<DocumentCountChartProps>;
