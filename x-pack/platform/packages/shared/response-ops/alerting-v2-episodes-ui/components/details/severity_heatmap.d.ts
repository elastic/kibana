import React from 'react';
import type { EpisodeEventRow } from '../../queries/episode_events_query';
import { type EpisodeSeverity } from '../severity/severity_utils';
export interface HeatmapDatum {
    x: number;
    y: string;
    value: number;
    ts: string;
    severity: EpisodeSeverity;
    eventData: Record<string, unknown> | null;
}
export interface AlertEpisodeSeverityHeatmapProps {
    eventRows: EpisodeEventRow[];
}
export declare const AlertEpisodeSeverityHeatmap: ({ eventRows }: AlertEpisodeSeverityHeatmapProps) => React.JSX.Element;
