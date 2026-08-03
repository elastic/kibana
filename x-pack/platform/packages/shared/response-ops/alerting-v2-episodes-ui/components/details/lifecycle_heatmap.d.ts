import React from 'react';
import type { EpisodeEventRow } from '../../queries/episode_events_query';
export interface AlertEpisodeLifecycleHeatmapProps {
    eventRows: EpisodeEventRow[];
}
export declare const AlertEpisodeLifecycleHeatmap: ({ eventRows }: AlertEpisodeLifecycleHeatmapProps) => React.JSX.Element;
