import React from 'react';
import type { AlertEpisodeDetailsServices } from './types';
export interface AlertEpisodeOverviewSectionProps {
    episodeId: string;
    groupHash: string | undefined;
    services: Pick<AlertEpisodeDetailsServices, 'data' | 'http' | 'expressions' | 'spaces' | 'uiSettings' | 'userProfile' | 'dataViews'>;
}
export declare const AlertEpisodeOverviewSection: ({ episodeId, groupHash, services, }: AlertEpisodeOverviewSectionProps) => React.JSX.Element;
