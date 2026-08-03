import type { HeatmapElementEvent } from '@elastic/charts';
import type { EuiBadgeProps, EuiThemeComputed } from '@elastic/eui';
export declare enum EpisodeSeverity {
    Info = "info",
    Low = "low",
    Medium = "medium",
    High = "high",
    Critical = "critical"
}
export declare const EPISODE_SEVERITIES: EpisodeSeverity[];
/** Just for the episodes list filters — episodes with no aggregated severity. */
export declare const EPISODE_SEVERITY_FILTER_NONE = "__no_severity__";
export declare const EPISODE_SEVERITY_CHART_VALUE: Record<EpisodeSeverity, number>;
interface EpisodeSeverityColorBand {
    start: EpisodeSeverity;
    end: EpisodeSeverity;
}
export declare const EPISODE_SEVERITY_CHART_COLOR_BANDS: readonly EpisodeSeverityColorBand[];
export declare const EPISODE_SEVERITY_BADGE_COLORS: Record<EpisodeSeverity, NonNullable<EuiBadgeProps['color']>>;
/** Heatmap cell fill colors aligned with `EuiBadge` fill backgrounds for each severity. */
export declare const getEpisodeSeverityHeatmapColor: (euiTheme: EuiThemeComputed, severity: EpisodeSeverity) => string;
export declare const isSupportedEpisodeSeverity: (severity: string | undefined | null) => severity is string;
export declare const normalizeEpisodeSeverity: (severity: string) => EpisodeSeverity;
export declare const getEpisodeSeverityLabel: (severity: EpisodeSeverity) => string;
export declare const toEpisodeSeverityChartColorBands: (colorForSeverity: (severity: EpisodeSeverity) => string) => Array<{
    start: number;
    end: number;
    color: string;
    label: string;
}>;
export interface HeatmapTableDatum {
    x: string | number;
    y: string | number;
    value: number;
    originalIndex: number;
}
export declare const getHeatmapDatumFromElementClick: <T>(elements: HeatmapElementEvent[], data: T[]) => T | undefined;
/** Returns true when the chart hover tooltip should be suppressed. */
export declare const shouldSuppressSeverityHeatmapTooltip: (selectedDatum: {
    x: number;
} | null) => boolean;
export {};
