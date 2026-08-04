import React from 'react';
import type { AlertEpisodeDetailsServices } from './types';
export interface AlertEpisodeTimelineHeatmapsSectionProps {
    episodeId: string;
    services: Pick<AlertEpisodeDetailsServices, 'data' | 'spaces'>;
}
/**
 * Renders the episode (status) timeline and severity timeline inside a single
 * shared bordered panel.
 */
export declare const AlertEpisodeTimelineHeatmapsSection: ({ episodeId, services, }: AlertEpisodeTimelineHeatmapsSectionProps) => React.JSX.Element;
