import React from 'react';
export interface AlertTimelineSeriesLabelProps {
    groupHash: string;
    groupingValues: Record<string, string | null>;
    episodeCount: number;
}
export declare const AlertTimelineSeriesLabel: React.FC<AlertTimelineSeriesLabelProps>;
