import React from 'react';
import type { AlertTimelineSummary } from '@kbn/alerting-v2-episodes-ui/alert_timeline';
export interface AlertTimelineStatsRowProps {
    summary: AlertTimelineSummary;
}
export declare const AlertTimelineStatsRow: React.FC<AlertTimelineStatsRowProps>;
