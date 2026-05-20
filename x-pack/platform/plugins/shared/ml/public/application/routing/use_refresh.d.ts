export interface Refresh {
    lastRefresh: number;
    timeRange?: {
        start: string;
        end: string;
    };
}
/**
 * Hook that provides the latest refresh timestamp
 * and the most recent applied time range.
 */
export declare const useRefresh: () => Refresh | undefined;
