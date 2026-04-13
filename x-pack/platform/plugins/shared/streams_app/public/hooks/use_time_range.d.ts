/**
 * Hook to get the current time range from URL params.
 *
 * Reads from URL search params directly to work across all routes.
 * Time params are defined in route definitions for type-safe navigation,
 * but read universally via URL for flexibility.
 *
 * Assumes DateRangeRedirect has ensured time params are present in the URL.
 */
export declare function useTimeRange(): {
    rangeFrom: string;
    rangeTo: string;
    start: string;
    end: string;
    startMs: number;
    endMs: number;
};
