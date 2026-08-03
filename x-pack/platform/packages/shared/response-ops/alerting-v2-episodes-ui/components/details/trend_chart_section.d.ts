import React from 'react';
import type { AlertEpisodeDetailsServices } from './types';
export interface AlertEpisodeTrendChartSectionProps {
    episodeId: string;
    services: Pick<AlertEpisodeDetailsServices, 'data' | 'http' | 'spaces'>;
}
export declare const AlertEpisodeTrendChartSection: ({ episodeId, services, }: AlertEpisodeTrendChartSectionProps) => React.JSX.Element | null;
