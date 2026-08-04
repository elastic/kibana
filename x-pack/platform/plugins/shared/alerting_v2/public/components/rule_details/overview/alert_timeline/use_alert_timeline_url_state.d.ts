export interface AlertTimelineTimeRange {
    from: string;
    to: string;
}
/**
 * Two-way URL state sync for the Alert Timeline time range. Hydrates
 * from `_a.activityTimeRange` on mount and writes back on every change so the
 * page URL is shareable and refresh-stable.
 */
export declare const useAlertTimelineUrlState: (defaultTimeRange: AlertTimelineTimeRange) => [AlertTimelineTimeRange, (next: AlertTimelineTimeRange) => void];
