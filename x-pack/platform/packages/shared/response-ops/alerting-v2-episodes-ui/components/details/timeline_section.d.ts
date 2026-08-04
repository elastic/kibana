import React from 'react';
import type { AlertEpisodeDetailsServices } from './types';
export interface AlertEpisodeTimelineSectionProps {
    episodeId: string;
    groupHash: string | undefined;
    services: Pick<AlertEpisodeDetailsServices, 'data' | 'spaces' | 'userProfile'>;
}
export declare const AlertEpisodeTimelineSection: ({ episodeId, groupHash, services, }: AlertEpisodeTimelineSectionProps) => React.JSX.Element;
