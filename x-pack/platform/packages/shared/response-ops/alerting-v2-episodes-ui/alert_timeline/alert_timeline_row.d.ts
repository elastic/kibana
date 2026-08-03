import React from 'react';
import type { Theme } from '@elastic/charts';
import type { AlertTimelineSeries } from './types';
export interface AlertTimelineRowProps {
    row: AlertTimelineSeries;
    windowStartMs: number;
    windowEndMs: number;
    height: number;
    baseTheme: Theme;
    timeZone?: string;
    onEpisodeClick?: (episodeId: string) => void;
    getEpisodeHref?: (episodeId: string) => string;
}
export declare const AlertTimelineRow: React.FC<AlertTimelineRowProps>;
