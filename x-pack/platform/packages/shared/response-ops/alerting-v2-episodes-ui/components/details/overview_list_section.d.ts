import React from 'react';
import type { AlertEpisodeDetailsServices } from './types';
export interface AlertEpisodeOverviewListSectionProps {
    episodeId: string;
    groupHash: string | undefined;
    services: Pick<AlertEpisodeDetailsServices, 'data' | 'http' | 'expressions' | 'spaces' | 'uiSettings' | 'userProfile' | 'dataViews'>;
}
export declare const AlertEpisodeOverviewListSection: ({ episodeId, groupHash, services, }: AlertEpisodeOverviewListSectionProps) => React.JSX.Element;
