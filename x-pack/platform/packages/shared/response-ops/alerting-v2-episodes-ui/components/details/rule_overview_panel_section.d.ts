import React from 'react';
import type { AlertEpisodeDetailsServices } from './types';
export interface AlertEpisodeRuleOverviewPanelSectionProps {
    episodeId: string;
    services: Pick<AlertEpisodeDetailsServices, 'data' | 'http' | 'spaces'>;
}
export declare const AlertEpisodeRuleOverviewPanelSection: ({ episodeId, services, }: AlertEpisodeRuleOverviewPanelSectionProps) => React.JSX.Element | null;
