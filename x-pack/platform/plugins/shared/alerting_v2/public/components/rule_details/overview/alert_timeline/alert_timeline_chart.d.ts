import React from 'react';
import type { AlertTimelineSeries } from '@kbn/alerting-v2-episodes-ui/alert_timeline';
export interface AlertTimelineChartProps {
    rows: AlertTimelineSeries[];
    windowStartMs: number;
    windowEndMs: number;
    timeZone?: string;
    /** Render the per-series label column. Omitted for ungrouped rules, whose hashes carry no useful label. */
    showLabelColumn: boolean;
    onEpisodeClick?: (episodeId: string) => void;
    getEpisodeHref?: (episodeId: string) => string;
}
export declare const AlertTimelineChart: React.FC<AlertTimelineChartProps>;
