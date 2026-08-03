export interface UseNewFeatureSeenResult {
    /** Whether the feature is still "new" (the user hasn't dismissed the indicator yet). */
    isNew: boolean;
    /** Marks the feature as seen and persists it, so the indicator won't show again. */
    markSeen: () => void;
}
/**
 * Backs a lightweight "new feature" indicator (e.g. a dot or badge) with a persisted,
 * per-browser "seen" flag. Keys should be version-scoped (see NEW_FEATURE_STORAGE_KEYS) so a
 * future feature reusing the same surface can re-trigger the indicator with a new key.
 */
export declare const useNewFeatureSeen: (storageKey: string) => UseNewFeatureSeenResult;
