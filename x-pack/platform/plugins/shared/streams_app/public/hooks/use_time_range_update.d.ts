import type { TimeRange } from '@kbn/es-query';
/**
 * Hook that provides a function to update time range in the URL.
 *
 * This modifies only the rangeFrom/rangeTo query params while preserving
 * all other existing params. Works on any route.
 *
 * Uses history.replace (not push) to avoid triggering useUnsavedChangesPrompt
 * when changing time range while editing forms.
 *
 * Note: Global timefilter is synced from URL at app level by DateRangeRedirect.
 * This hook only handles URL persistence.
 */
export declare function useTimeRangeUpdate(): {
    updateTimeRange: (nextRange: TimeRange) => void;
};
