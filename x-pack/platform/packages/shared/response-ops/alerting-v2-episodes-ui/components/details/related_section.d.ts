import React from 'react';
import type { AlertEpisodeDetailsServices } from './types';
export interface AlertEpisodesRelatedSectionProps {
    episodeId: string;
    services: Pick<AlertEpisodeDetailsServices, 'data' | 'http' | 'spaces'>;
    showHeading?: boolean;
    compressed?: boolean;
}
export declare const AlertEpisodesRelatedSection: ({ episodeId, services, showHeading, compressed, }: AlertEpisodesRelatedSectionProps) => React.JSX.Element;
