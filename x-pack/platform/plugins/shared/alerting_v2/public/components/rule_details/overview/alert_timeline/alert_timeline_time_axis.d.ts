import React from 'react';
export interface AlertTimelineTimeAxisProps {
    windowStartMs: number;
    windowEndMs: number;
    /** Kibana `dateFormat:tz` setting. Pass `'Browser'` or omit to use the browser's local timezone. */
    timeZone?: string;
}
/**
 * Top-of-chart date axis. Renders one subdued label per tick inside the
 * window, positioned by absolute percentage offset against the time domain
 * shared with the bars below.
 */
export declare const AlertTimelineTimeAxis: React.FC<AlertTimelineTimeAxisProps>;
