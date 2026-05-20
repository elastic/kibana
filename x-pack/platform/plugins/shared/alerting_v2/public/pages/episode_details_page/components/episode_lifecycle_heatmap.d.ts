import React from 'react';
import type { EpisodeEventRow } from '@kbn/alerting-v2-episodes-ui/queries/episode_events_query';
export interface EpisodeLifecycleHeatmapProps {
    eventRows: EpisodeEventRow[];
}
export declare const EpisodeLifecycleHeatmap: ({ eventRows }: EpisodeLifecycleHeatmapProps) => React.JSX.Element;
