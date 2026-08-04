import React from 'react';
import type { AlertEpisodeDetailsServices } from './types';
export interface AlertEpisodeRunbookSectionProps {
    episodeId: string;
    services: Pick<AlertEpisodeDetailsServices, 'data' | 'http' | 'spaces'>;
}
export declare const AlertEpisodeRunbookSection: ({ episodeId, services, }: AlertEpisodeRunbookSectionProps) => React.JSX.Element | null;
